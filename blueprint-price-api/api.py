import logging
from flask import Flask, request, jsonify
from pycaret.regression import load_model, predict_model
import pandas as pd
import numpy as np
import traceback
from flask_cors import CORS
import os
import sqlite3
from dotenv import load_dotenv

# 根據環境載入不同的 .env 檔案
if os.environ.get('ENV') == 'production':
    load_dotenv('.env.production')
else:
    load_dotenv('.env.local')

# 設置日誌
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# 載入模型
model = load_model("models/final_model_with_pipeline")
logger.info("模型載入成功！")

def safe_divide(a, b, fill_value=0):
    """安全的除法運算"""
    return np.where(b > 0, a / b, fill_value)

def process_features(df):
    """處理輸入特徵，與訓練時保持一致"""
    # 確保數值欄位是數值型態
    numeric_cols = [
        '長度', '寬度', '高度', '靜壓mmAq', '馬力HP', 
        '風量NCMM', '操作溫度°C', '採購數量', '葉輪直徑mm'
    ]
    
    # 處理數值欄位
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            if col in ['長度', '寬度', '高度']:
                df[col] = df[col].fillna(0)
            else:
                df[col] = df[col].fillna(df[col].median() if not df[col].empty else 0)
    
    # 計算衍生特徵
    df['體積'] = df['長度'] * df['寬度'] * df['高度']
    df['功率密度'] = np.where(df['體積'] > 0, df['馬力HP'] / df['體積'], 0)
    df['風量效率'] = np.where(df['馬力HP'] > 0, df['風量NCMM'] / df['馬力HP'], 0)
    df['壓力效率'] = np.where(df['馬力HP'] > 0, df['靜壓mmAq'] / df['馬力HP'], 0)
    df['長寬比'] = np.where(df['寬度'] > 0, df['長度'] / df['寬度'], 0)
    df['高寬比'] = np.where(df['寬度'] > 0, df['高度'] / df['寬度'], 0)
    
    # 確保類別特徵是字串類型
    categorical_cols = [
        "系列", "型號", "出口⽅向", "機殼材質", "架台材質",  # 移除 "規格"
        "產品名稱", "驅動方式", "防火花級", "單雙吸",
        "風機等級"
    ]
    
    for col in categorical_cols:
        if col in df.columns:
            df[col] = df[col].astype(str)
            df[col] = df[col].fillna('未知')
    
    # 處理型號與規格的映射關係
    if '規格' in df.columns and '型號' not in df.columns:
        df['型號'] = df['規格']  # 將規格映射為型號，以符合模型需求
    elif '型號' in df.columns and '規格' not in df.columns:
        df['規格'] = df['型號']  # 將型號映射為規格
    
    return df

@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        logger.debug(f"收到的數據: {data}")
        
        # 處理輸入資料
        filtered_data = {}
        for key, value in data.items():
            filtered_data[key] = value[0] if isinstance(value, list) else value
        
        # 轉為 DataFrame
        input_df = pd.DataFrame([filtered_data])
        logger.debug(f"初始數據: {input_df.to_dict(orient='records')}")
        
        # 生成衍生特徵
        input_df = process_features(input_df)
        logger.debug(f"處理後的數據: {input_df.to_dict(orient='records')}")
        
        # 進行預測
        prediction = predict_model(model, data=input_df)
        predicted_price = prediction['prediction_label'].iloc[0]
        
        return jsonify({
            '預測價格': f"{predicted_price:,.2f} 元",
            '輸入資料摘要': {
                '基本資訊': {
                    '尺寸': f"{filtered_data.get('長度')}x{filtered_data.get('寬度')}x{filtered_data.get('高度')} mm",
                    '規格': filtered_data.get('規格', '未知'),
                    '出口方向': filtered_data.get('出口⽅向', '未知')
                },
                '性能參數': {
                    '馬力': f"{filtered_data.get('馬力HP', '0')} HP",
                    '風量': f"{filtered_data.get('風量NCMM', '0')} NCMM",
                    '靜壓': f"{filtered_data.get('靜壓mmAq', '0')} mmAq"
                },
                '材質資訊': {
                    '機殼材質': filtered_data.get('機殼材質', '未知'),
                    '架台材質': filtered_data.get('架台材質', '未知')
                }
            }
        })
        
    except Exception as e:
        logger.error(f"預測錯誤: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            '錯誤': str(e),
            '訊息': '預測過程中發生錯誤',
            '除錯資訊': {
                '可用的特徵欄位': input_df.columns.tolist() if 'input_df' in locals() else None
            }
        }), 500

@app.route('/history', methods=['GET'])
def get_history():
    try:
        # 連接資料庫
        db_path = './procurement_data.db'
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row  # 讓查詢結果可以用字典格式存取
        
        # 取得查詢參數
        search_params = {
            'length': request.args.get('length'),
            'width': request.args.get('width'),
            'height': request.args.get('height'),
            'static_pressure': request.args.get('static_pressure'),
            'horsepower': request.args.get('horsepower'),
            'airflow': request.args.get('airflow'),
            'impeller_diameter': request.args.get('impeller_diameter'),
            'material': request.args.get('material'),
            'casing_material': request.args.get('casing_material'),
            'frame_material': request.args.get('frame_material'),
            'product_name': request.args.get('product_name'),
            'model': request.args.get('model'),
            'outlet_direction': request.args.get('outlet_direction'),
            'drive_method': request.args.get('drive_method')
        }
        
        # 建立基本查詢，聯接 procurement_orders 表格取得 purchase_date
        base_query = """
        SELECT DISTINCT
            f.vendor_name,
            f.order_number,
            f.length,
            f.width,
            f.height,
            f.volume,
            f.product_name,
            f.model,
            f.specification,
            f.outlet_direction,
            f.material,
            f.casing_material,
            f.frame_material,
            f.static_pressure_mmaq,
            f.horsepower_hp,
            f.airflow_ncmm,
            f.impeller_diameter_mm,
            f.operating_temperature_c,
            f.drive_method,
            f.fire_spark_level,
            f.single_double_suction,
            f.fan_grade,
            f.unit_price,
            f.purchase_quantity,
            f.created_at,
            p.purchase_date,
            f.id
        FROM final_processed_orders f
        LEFT JOIN procurement_final_mapping m ON f.id = m.final_processed_id
        LEFT JOIN procurement_orders p ON m.procurement_id = p.id
        WHERE f.unit_price IS NOT NULL AND f.unit_price > 0
        """
        
        # 建立模糊搜尋條件
        conditions = []
        params = []
        
        # 數值型欄位使用範圍搜尋 (±20%)
        if search_params['length']:
            try:
                length = float(search_params['length'])
                min_length = length * 0.8
                max_length = length * 1.2
                conditions.append("(f.length BETWEEN ? AND ?)")
                params.extend([min_length, max_length])
            except ValueError:
                pass
                
        if search_params['width']:
            try:
                width = float(search_params['width'])
                min_width = width * 0.8
                max_width = width * 1.2
                conditions.append("(f.width BETWEEN ? AND ?)")
                params.extend([min_width, max_width])
            except ValueError:
                pass
                
        if search_params['height']:
            try:
                height = float(search_params['height'])
                min_height = height * 0.8
                max_height = height * 1.2
                conditions.append("(f.height BETWEEN ? AND ?)")
                params.extend([min_height, max_height])
            except ValueError:
                pass
                
        if search_params['static_pressure']:
            try:
                pressure = float(search_params['static_pressure'])
                min_pressure = pressure * 0.7
                max_pressure = pressure * 1.3
                conditions.append("(f.static_pressure_mmaq BETWEEN ? AND ?)")
                params.extend([min_pressure, max_pressure])
            except ValueError:
                pass
                
        if search_params['horsepower']:
            try:
                hp = float(search_params['horsepower'])
                min_hp = hp * 0.7
                max_hp = hp * 1.3
                conditions.append("(f.horsepower_hp BETWEEN ? AND ?)")
                params.extend([min_hp, max_hp])
            except ValueError:
                pass
                
        if search_params['airflow']:
            try:
                airflow = float(search_params['airflow'])
                min_airflow = airflow * 0.7
                max_airflow = airflow * 1.3
                conditions.append("(f.airflow_ncmm BETWEEN ? AND ?)")
                params.extend([min_airflow, max_airflow])
            except ValueError:
                pass
                
        if search_params['impeller_diameter']:
            try:
                diameter = float(search_params['impeller_diameter'])
                min_diameter = diameter * 0.8
                max_diameter = diameter * 1.2
                conditions.append("(f.impeller_diameter_mm BETWEEN ? AND ?)")
                params.extend([min_diameter, max_diameter])
            except ValueError:
                pass
        
        # 文字型欄位使用 LIKE 搜尋
        if search_params['material']:
            conditions.append("(f.material LIKE ? OR f.casing_material LIKE ?)")
            params.extend([f"%{search_params['material']}%", f"%{search_params['material']}%"])
            
        if search_params['casing_material']:
            conditions.append("(f.casing_material LIKE ?)")
            params.append(f"%{search_params['casing_material']}%")
            
        if search_params['frame_material']:
            conditions.append("(f.frame_material LIKE ?)")
            params.append(f"%{search_params['frame_material']}%")
            
        if search_params['product_name']:
            conditions.append("(f.product_name LIKE ?)")
            params.append(f"%{search_params['product_name']}%")
            
        if search_params['model']:
            conditions.append("(f.model LIKE ? OR f.specification LIKE ?)")
            params.extend([f"%{search_params['model']}%", f"%{search_params['model']}%"])
            
        if search_params['outlet_direction']:
            conditions.append("(f.outlet_direction LIKE ?)")
            params.append(f"%{search_params['outlet_direction']}%")
            
        if search_params['drive_method']:
            conditions.append("(f.drive_method LIKE ?)")
            params.append(f"%{search_params['drive_method']}%")
        
        # 組合查詢條件
        if conditions:
            query = base_query + " AND (" + " OR ".join(conditions) + ")"
        else:
            query = base_query
            
        query += " ORDER BY COALESCE(p.purchase_date, f.created_at) DESC LIMIT 10"
        
        logger.info(f"執行查詢: {query}")
        logger.info(f"查詢參數: {params}")
        
        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        
        # 將資料轉換為字典列表
        history_data = []
        for row in rows:
            history_data.append({
                'vendor_name': row['vendor_name'],
                'order_number': row['order_number'],
                'length': row['length'],
                'width': row['width'],
                'height': row['height'],
                'volume': row['volume'],
                'product_name': row['product_name'],
                'model': row['model'],
                'specification': row['specification'],
                'outlet_direction': row['outlet_direction'],
                'material': row['material'],
                'casing_material': row['casing_material'],
                'frame_material': row['frame_material'],
                'static_pressure_mmaq': row['static_pressure_mmaq'],
                'horsepower_hp': row['horsepower_hp'],
                'airflow_ncmm': row['airflow_ncmm'],
                'impeller_diameter_mm': row['impeller_diameter_mm'],
                'operating_temperature_c': row['operating_temperature_c'],
                'drive_method': row['drive_method'],
                'fire_spark_level': row['fire_spark_level'],
                'single_double_suction': row['single_double_suction'],
                'fan_grade': row['fan_grade'],
                'unit_price': row['unit_price'],
                'purchase_quantity': row['purchase_quantity'],
                'created_at': row['created_at'],
                'purchase_date': row['purchase_date']
            })
        
        conn.close()
        
        logger.info(f"找到 {len(history_data)} 筆相關歷史記錄")
        return jsonify(history_data)
        
    except Exception as e:
        logger.error(f"獲取歷史資料錯誤: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            '錯誤': str(e),
            '訊息': '獲取歷史資料時發生錯誤'
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """健康檢查端點"""
    return jsonify({
        'status': 'healthy',
        'message': 'Blueprint Price API is running',
        'version': '1.0.0'
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8081))
    app.run(host='0.0.0.0', port=port)