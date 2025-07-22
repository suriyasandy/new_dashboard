#!/usr/bin/env python3
"""
Flask API Server for GFX Threshold Deviation Dashboard
Bridges the React frontend with Python backend processing
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import threading
from datetime import datetime
from pathlib import Path
import pandas as pd
from main import GFXDataProcessor, DataRequest, ProcessingStatus

app = Flask(__name__)
CORS(app)

# Global variables for status tracking
processor = GFXDataProcessor()
processing_status = {}
processing_lock = threading.Lock()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "gfx-dashboard-python"})

@app.route('/api/data/download', methods=['POST'])
def download_data():
    """Start parallel data download process"""
    try:
        data = request.get_json()
        
        # Validate request
        required_fields = ['product_type', 'legal_entities', 'source_systems', 'start_date', 'end_date']
        if not all(field in data for field in required_fields):
            return jsonify({"error": f"Missing required fields: {required_fields}"}), 400
        
        # Create data request
        data_request = DataRequest(
            product_type=data['product_type'],
            legal_entities=data['legal_entities'],
            source_systems=data['source_systems'],
            start_date=data['start_date'],
            end_date=data['end_date'],
            download_trades=data.get('download_trades', True),
            download_exceptions=data.get('download_exceptions', True)
        )
        
        # Generate unique request ID
        request_id = f"req_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Start processing in background thread
        def background_process():
            with processing_lock:
                processing_status[request_id] = {"status": "started", "statuses": []}
            
            try:
                statuses = processor.process_parallel_downloads(data_request)
                
                # Calculate matching for completed downloads
                matched_results = {}
                for status in statuses:
                    if (status.status == "completed" and 
                        status.environment in ["UAT", "PROD"]):
                        
                        # Find the corresponding UAT/PROD pair
                        key = f"{status.legal_entity}_{status.source_system}"
                        if key not in matched_results:
                            matched_results[key] = {}
                        
                        matched_results[key][status.environment] = {
                            "count": status.records_count,
                            "status": status.status
                        }
                
                # Calculate matched/unmatched for each pair
                for key, envs in matched_results.items():
                    if "UAT" in envs and "PROD" in envs:
                        legal_entity, source_system = key.split("_")
                        match_result = processor.match_uat_prod_trades(
                            legal_entity, source_system, 
                            data_request.product_type,
                            data_request.start_date, 
                            data_request.end_date
                        )
                        matched_results[key]["matching"] = match_result
                
                with processing_lock:
                    processing_status[request_id] = {
                        "status": "completed",
                        "statuses": [status.__dict__ for status in statuses],
                        "matching_results": matched_results
                    }
                    
            except Exception as e:
                with processing_lock:
                    processing_status[request_id] = {
                        "status": "failed", 
                        "error": str(e)
                    }
        
        thread = threading.Thread(target=background_process)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "request_id": request_id,
            "status": "processing_started",
            "message": "Data download started in background"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/status/<request_id>', methods=['GET'])
def get_processing_status(request_id):
    """Get status of data processing request"""
    with processing_lock:
        if request_id not in processing_status:
            return jsonify({"error": "Request ID not found"}), 404
        
        return jsonify(processing_status[request_id])

@app.route('/api/thresholds/upload', methods=['POST'])
def upload_threshold_file():
    """Upload and process threshold file"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        threshold_mode = request.form.get('threshold_mode', 'group')
        
        # Save uploaded file
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        
        file_path = upload_dir / file.filename
        file.save(file_path)
        
        # Process threshold file
        result = processor.process_threshold_file(str(file_path), threshold_mode)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify({
            "message": "Threshold file uploaded successfully",
            "result": result
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/thresholds', methods=['GET'])
def get_thresholds():
    """Get processed threshold data"""
    try:
        threshold_mode = request.args.get('mode', 'group')
        threshold_file = processor.thresholds_dir / f"processed_thresholds_{threshold_mode}.csv"
        
        if not threshold_file.exists():
            return jsonify([])
        
        df = pd.read_csv(threshold_file)
        
        if threshold_mode == 'group':
            # Group-wise: aggregate by group
            grouped = df.groupby(['Adjusted_Group']).agg({
                'Original_Threshold': 'max',
                'Proposed_Threshold': 'max', 
                'Adjusted_Threshold': 'max'
            }).reset_index()
            
            result = []
            for _, row in grouped.iterrows():
                result.append({
                    "id": len(result) + 1,
                    "group": row['Adjusted_Group'],
                    "originalThreshold": row['Original_Threshold'],
                    "proposedThreshold": row['Proposed_Threshold'],
                    "adjustedThreshold": row['Adjusted_Threshold']
                })
        else:
            # Currency-wise: individual currencies
            result = []
            for _, row in df.iterrows():
                result.append({
                    "id": len(result) + 1,
                    "legalEntity": row['LegalEntity'],
                    "currency": row['CCY'],
                    "group": row['Adjusted_Group'],
                    "originalThreshold": row['Original_Threshold'],
                    "proposedThreshold": row['Proposed_Threshold'],
                    "adjustedThreshold": row['Adjusted_Threshold']
                })
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/thresholds/<int:threshold_id>', methods=['PATCH'])
def update_threshold(threshold_id):
    """Update threshold value"""
    try:
        data = request.get_json()
        threshold_mode = request.args.get('mode', 'group')
        threshold_file = processor.thresholds_dir / f"processed_thresholds_{threshold_mode}.csv"
        
        if not threshold_file.exists():
            return jsonify({"error": "Threshold file not found"}), 404
        
        df = pd.read_csv(threshold_file)
        
        # Update logic depends on mode
        if threshold_mode == 'group':
            # Update all thresholds in the group
            group_name = data.get('group')
            new_threshold = data.get('adjustedThreshold')
            
            if group_name and new_threshold is not None:
                df.loc[df['Adjusted_Group'] == group_name, 'Adjusted_Threshold'] = new_threshold
        else:
            # Update specific currency threshold
            # Implementation depends on how you identify the specific row
            pass
        
        # Save updated file
        df.to_csv(threshold_file, index=False)
        
        return jsonify({"message": "Threshold updated successfully"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analysis/deviation-buckets', methods=['POST'])
def analyze_deviation_buckets():
    """Calculate deviation bucket analysis"""
    try:
        data = request.get_json()
        threshold_mode = data.get('threshold_mode', 'group')
        
        # Load all matched trade data
        trades_data = []
        for uat_file in processor.trades_dir.rglob("UAT/*.gz"):
            try:
                import gzip
                with gzip.open(uat_file, 'rt') as f:
                    df = pd.read_csv(f)
                    trades_data.append(df)
            except Exception:
                continue
        
        if not trades_data:
            return jsonify([])
        
        combined_trades = pd.concat(trades_data, ignore_index=True)
        
        # Apply threshold logic and create buckets
        buckets = [
            {"range": "0.0% - 0.5%", "USD": 0, "EUR": 0, "GBP": 0, "JPY": 0, "total": 0, "isExceeding": False},
            {"range": "0.5% - 1.0%", "USD": 0, "EUR": 0, "GBP": 0, "JPY": 0, "total": 0, "isExceeding": True},
            {"range": "1.0% - 2.0%", "USD": 0, "EUR": 0, "GBP": 0, "JPY": 0, "total": 0, "isExceeding": True},
            {"range": "2.0% - 5.0%", "USD": 0, "EUR": 0, "GBP": 0, "JPY": 0, "total": 0, "isExceeding": True},
            {"range": "5.0%+", "USD": 0, "EUR": 0, "GBP": 0, "JPY": 0, "total": 0, "isExceeding": True}
        ]
        
        # Count alerts by currency and deviation range
        for _, trade in combined_trades.iterrows():
            deviation = float(trade.get('deviation_percent', 0))
            ccy_pair = trade.get('ccy_pair', '')
            
            # Extract base and quote currencies
            if len(ccy_pair) == 6:
                base_ccy = ccy_pair[:3] 
                quote_ccy = ccy_pair[3:]
                
                # Determine bucket
                bucket_idx = 0
                if deviation >= 5.0:
                    bucket_idx = 4
                elif deviation >= 2.0:
                    bucket_idx = 3
                elif deviation >= 1.0:
                    bucket_idx = 2
                elif deviation >= 0.5:
                    bucket_idx = 1
                
                # Count for both currencies
                for ccy in [base_ccy, quote_ccy]:
                    if ccy in buckets[bucket_idx]:
                        buckets[bucket_idx][ccy] += 1
        
        # Calculate totals
        for bucket in buckets:
            bucket["total"] = bucket["USD"] + bucket["EUR"] + bucket["GBP"] + bucket["JPY"]
        
        return jsonify(buckets)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/export/<data_type>', methods=['GET'])
def export_data(data_type):
    """Export data as CSV"""
    try:
        if data_type == "trades":
            # Export all matched trades
            export_file = processor.base_dir / "exports" / "all_trades.csv"
            export_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Combine all trade data
            all_trades = []
            for uat_file in processor.trades_dir.rglob("UAT/*.gz"):
                try:
                    import gzip
                    with gzip.open(uat_file, 'rt') as f:
                        df = pd.read_csv(f)
                        all_trades.append(df)
                except Exception:
                    continue
            
            if all_trades:
                combined_df = pd.concat(all_trades, ignore_index=True)
                combined_df.to_csv(export_file, index=False)
                return send_file(export_file, as_attachment=True)
            
        elif data_type == "thresholds":
            # Export current thresholds
            threshold_file = processor.thresholds_dir / "processed_thresholds_group.csv"
            if threshold_file.exists():
                return send_file(threshold_file, as_attachment=True)
        
        return jsonify({"error": "No data available for export"}), 404
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)