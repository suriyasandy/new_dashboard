#!/usr/bin/env python3
"""
GFX Threshold Deviation Dashboard - Python Backend
Handles UAT/PROD API calls, file downloads, and data processing
"""

import os
import asyncio
import pandas as pd
import requests
import gzip
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DataRequest:
    product_type: str
    legal_entities: List[str]
    source_systems: List[str]
    start_date: str
    end_date: str
    download_trades: bool = True
    download_exceptions: bool = True

@dataclass
class ProcessingStatus:
    legal_entity: str
    source_system: str
    environment: str  # UAT or PROD
    status: str  # pending, downloading, processing, completed, failed
    records_count: int = 0
    error_message: Optional[str] = None

class GFXDataProcessor:
    def __init__(self):
        self.base_dir = Path("data")
        self.trades_dir = self.base_dir / "trades"
        self.exceptions_dir = self.base_dir / "exceptions"
        self.thresholds_dir = self.base_dir / "thresholds"
        
        # Create directories
        for directory in [self.trades_dir, self.exceptions_dir, self.thresholds_dir]:
            directory.mkdir(parents=True, exist_ok=True)
    
    def get_oauth_token(self, environment: str) -> str:
        """Get OAuth token for UAT or PROD environment"""
        # TODO: Implement OAuth authentication
        # This would connect to your actual OAuth service
        return f"mock_token_{environment.lower()}"
    
    def download_trade_data(self, legal_entity: str, source_system: str, 
                          environment: str, product_type: str, 
                          start_date: str, end_date: str) -> Tuple[int, Optional[str]]:
        """Download trade data for specific parameters"""
        try:
            # Construct filename: ProductType_LegalEntity_SourceSystem_StartDate_EndDate.gz
            filename = f"{product_type}_{legal_entity}_{source_system}_{start_date}_{end_date}.gz"
            file_path = self.trades_dir / environment / filename
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Get OAuth token
            token = self.get_oauth_token(environment)
            
            # Construct API URL (replace with actual endpoints)
            base_url = "https://api-uat.company.com" if environment == "UAT" else "https://api-prod.company.com"
            url = f"{base_url}/trades"
            
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            params = {
                "product_type": product_type,
                "legal_entity": legal_entity,
                "source_system": source_system,
                "start_date": start_date,
                "end_date": end_date
            }
            
            logger.info(f"Downloading {environment} data for {legal_entity}/{source_system}")
            
            # Simulate API call with mock data for demo
            # In real implementation, uncomment the following:
            # response = requests.get(url, headers=headers, params=params, stream=True)
            # response.raise_for_status()
            
            # Mock data generation for demo
            mock_data = self._generate_mock_trade_data(legal_entity, source_system, 1000)
            
            # Save compressed data
            with gzip.open(file_path, 'wt') as f:
                mock_data.to_csv(f, index=False)
            
            records_count = len(mock_data)
            logger.info(f"Downloaded {records_count} records to {file_path}")
            
            return records_count, None
            
        except Exception as e:
            error_msg = f"Failed to download {environment} data: {str(e)}"
            logger.error(error_msg)
            return 0, error_msg
    
    def download_exception_data(self, start_date: str, end_date: str) -> Tuple[int, Optional[str]]:
        """Download exception data for date range"""
        try:
            filename = f"exceptions_{start_date}_{end_date}.csv"
            file_path = self.exceptions_dir / filename
            
            # Mock exception data
            mock_exceptions = pd.DataFrame({
                'trade_id': [f'TRD-2024-{i:06d}' for i in range(1, 51)],
                'exception_type': ['PRICE_DEVIATION', 'LIQUIDITY_ISSUE', 'TIMEOUT'] * 17,
                'description': ['Price deviation detected', 'Low liquidity', 'Request timeout'] * 17,
                'status': ['OPEN', 'RESOLVED', 'PENDING'] * 17,
                'created_at': [datetime.now() - timedelta(days=i) for i in range(50)]
            })
            
            mock_exceptions.to_csv(file_path, index=False)
            logger.info(f"Downloaded {len(mock_exceptions)} exception records")
            
            return len(mock_exceptions), None
            
        except Exception as e:
            error_msg = f"Failed to download exception data: {str(e)}"
            logger.error(error_msg)
            return 0, error_msg
    
    def _generate_mock_trade_data(self, legal_entity: str, source_system: str, count: int) -> pd.DataFrame:
        """Generate mock trade data for demo purposes"""
        import random
        
        currencies = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'EURGBP']
        
        data = []
        for i in range(count):
            ccy_pair = random.choice(currencies)
            deviation = round(random.uniform(0.1, 3.0), 4)
            
            trade = {
                'trade_id': f'TRD-{legal_entity}-{i+1:06d}',
                'product_type': 'FX_SPOT',
                'legal_entity': legal_entity,
                'source_system': source_system,
                'ccy_pair': ccy_pair,
                'trade_date': datetime.now() - timedelta(days=random.randint(1, 30)),
                'deviation_percent': deviation,
                'alert_description': f'Deviation {deviation}% detected' if deviation > 0.5 else None,
                'is_out_of_scope': random.random() > 0.95
            }
            data.append(trade)
        
        return pd.DataFrame(data)
    
    def process_parallel_downloads(self, request: DataRequest) -> List[ProcessingStatus]:
        """Process downloads in parallel for all legal entity/source system combinations"""
        status_list = []
        
        # Create status objects for all combinations
        for legal_entity in request.legal_entities:
            for source_system in request.source_systems:
                if request.download_trades:
                    status_list.extend([
                        ProcessingStatus(legal_entity, source_system, "UAT", "pending"),
                        ProcessingStatus(legal_entity, source_system, "PROD", "pending")
                    ])
        
        # Add exception data status if requested
        if request.download_exceptions:
            status_list.append(ProcessingStatus("ALL", "ALL", "EXCEPTIONS", "pending"))
        
        # Process downloads in parallel
        with ThreadPoolExecutor(max_workers=6) as executor:
            future_to_status = {}
            
            for status in status_list:
                if status.environment in ["UAT", "PROD"]:
                    future = executor.submit(
                        self.download_trade_data,
                        status.legal_entity,
                        status.source_system,
                        status.environment,
                        request.product_type,
                        request.start_date,
                        request.end_date
                    )
                elif status.environment == "EXCEPTIONS":
                    future = executor.submit(
                        self.download_exception_data,
                        request.start_date,
                        request.end_date
                    )
                
                future_to_status[future] = status
                status.status = "downloading"
            
            # Collect results
            for future in as_completed(future_to_status):
                status = future_to_status[future]
                try:
                    records_count, error = future.result()
                    if error:
                        status.status = "failed"
                        status.error_message = error
                    else:
                        status.status = "completed"
                        status.records_count = records_count
                except Exception as e:
                    status.status = "failed"
                    status.error_message = str(e)
        
        return status_list
    
    def match_uat_prod_trades(self, legal_entity: str, source_system: str, 
                            product_type: str, start_date: str, end_date: str) -> Dict:
        """Match UAT trades with PROD trades by trade_id"""
        try:
            # Load UAT and PROD data
            uat_file = self.trades_dir / "UAT" / f"{product_type}_{legal_entity}_{source_system}_{start_date}_{end_date}.gz"
            prod_file = self.trades_dir / "PROD" / f"{product_type}_{legal_entity}_{source_system}_{start_date}_{end_date}.gz"
            
            if not uat_file.exists() or not prod_file.exists():
                return {"error": "Required files not found"}
            
            # Read data
            with gzip.open(uat_file, 'rt') as f:
                uat_df = pd.read_csv(f)
            
            with gzip.open(prod_file, 'rt') as f:
                prod_df = pd.read_csv(f)
            
            # Match by trade_id
            prod_trade_ids = set(prod_df['trade_id'])
            uat_matched = uat_df[uat_df['trade_id'].isin(prod_trade_ids)]
            uat_unmatched = uat_df[~uat_df['trade_id'].isin(prod_trade_ids)]
            
            # Filter out "out of scope" trades
            uat_matched_filtered = uat_matched[
                ~uat_matched['alert_description'].str.contains('out of scope', case=False, na=False)
            ]
            
            return {
                "prod_count": len(prod_df),
                "uat_count": len(uat_df),
                "matched_count": len(uat_matched_filtered),
                "unmatched_count": len(uat_unmatched),
                "matched_data": uat_matched_filtered
            }
            
        except Exception as e:
            return {"error": f"Matching failed: {str(e)}"}
    
    def process_threshold_file(self, file_path: str, threshold_mode: str = "group") -> Dict:
        """Process uploaded threshold file"""
        try:
            df = pd.read_csv(file_path)
            
            # Validate required columns
            required_cols = ['LegalEntity', 'CCY', 'Original_Group', 'Original_Threshold', 
                           'Proposed_Group', 'Proposed_Threshold']
            
            if not all(col in df.columns for col in required_cols):
                return {"error": f"Missing required columns: {required_cols}"}
            
            # Add adjusted columns (default to proposed)
            df['Adjusted_Group'] = df['Proposed_Group']
            df['Adjusted_Threshold'] = df['Proposed_Threshold']
            
            # Save processed threshold file
            processed_path = self.thresholds_dir / f"processed_thresholds_{threshold_mode}.csv"
            df.to_csv(processed_path, index=False)
            
            return {
                "status": "success",
                "rows_processed": len(df),
                "threshold_mode": threshold_mode,
                "file_path": str(processed_path)
            }
            
        except Exception as e:
            return {"error": f"Threshold processing failed: {str(e)}"}

# Example usage and API endpoints would be implemented here
if __name__ == "__main__":
    processor = GFXDataProcessor()
    
    # Example request
    request = DataRequest(
        product_type="FX_SPOT",
        legal_entities=["GSLB", "GSI"],
        source_systems=["SLANG", "SIGMA"],
        start_date="2024-01-01",
        end_date="2024-01-31"
    )
    
    # Process downloads
    statuses = processor.process_parallel_downloads(request)
    
    # Print results
    for status in statuses:
        print(f"{status.legal_entity}/{status.source_system}/{status.environment}: "
              f"{status.status} - {status.records_count} records")