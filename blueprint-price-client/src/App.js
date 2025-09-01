import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Scan from './components/Scan';
import ResultsTable from './components/ResultsTable';
import SmartDimensionInput from './components/SmartDimensionInput';
import IPCheck from './components/IPCheck';
import { API_BASE_URL, API_ENDPOINTS } from './config/api';

function App() {
  const [formData, setFormData] = useState({
    // 基本數值欄位
    長度: '2500',      // 中位數
    寬度: '2500',      // 中位數
    高度: '2500',      // 中位數
    靜壓mmAq: '1500',  // 中位數
    馬力HP: '250',     // 中位數
    風量NCMM: '1500',  // 中位數
    '操作溫度°C': '20', // 改用正確的欄位名稱
    採購數量: '1',
    '葉輪直徑mm': '1500', // 中位數
    // 計算特徵
    體積: '0',
    功率密度: '0',
    風量效率: '0',
    壓力效率: '0',
    長寬比: '0',
    高寬比: '0',
    // 類別特徵
    系列: '',
    規格: '',          // 改用「規格」而不是「型號」
    '出口⽅向': '',
    機殼材質: 'SS400',
    架台材質: 'SS400',
    產品名稱: '',
    驅動方式: '皮帶式',
    防火花級: '無',
    單雙吸: '單吸',
    風機等級: 'A'
  });
  const [predictedPriceOriginal, setPredictedPriceOriginal] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorOriginal, setErrorOriginal] = useState(null);
  const [queryResults, setQueryResults] = useState([]);

  // 更新下拉選單選項
  const dropdownOptions = {
    系列: ['5500', '5800', '6100', '6105', '6195', 'SAF', 'SQA', 'TF', 'VAF'],
    規格: ['型一', '型二', '型三', '型五', '型六'],  // 改用「規格」
    '出口⽅向': ['A', 'B', 'C', 'D', 'E', 'F', 'I', 'K', 'L'],
    產品名稱: [
      '12.6KW風機',
      '多段鼓風機',
      '翼截式風機',
      '翼截風機',
      '軸流式風機',
      '透浦式風機'
    ],
    機殼材質: ['SAF2205', 'SS400', 'SUS304', 'SUS316', 'SUS316L', '冷鍍鋅板'],
    架台材質: ['SAF2205', 'SS400', 'SUS304', 'SUS316', 'SUS316L', '冷鍍鋅板'],
    驅動方式: ['皮帶式', '直結式'],
    防火花級: ['無', 'A', 'B', 'C', 'D'],
    單雙吸: ['單吸', '雙吸', '單吸單持', '雙吸雙持'],
    風機等級: ['A', 'AA', 'AB', 'BB']
  };

  // 新增數值欄位的限制設定
  const numericLimits = {
    // 長度和寬度使用智能輸入組件，不設限制
    高度: { min: 0, max: 5000, step: 1 },
    '葉輪直徑mm': { min: 0, max: 3000, step: 1 },
    靜壓mmAq: { min: 0, max: 3000, step: 1 },
    馬力HP: { min: 0, max: 500, step: 0.1 },
    風量NCMM: { min: 0, max: 2500, step: 1 },
    '操作溫度°C': { min: 0, max: 300, step: 1 },
    採購數量: { min: 1, max: 50, step: 1 }
  };

  // 自動計算特徵
  useEffect(() => {
    const { 長度, 寬度, 高度, 馬力HP, 風量NCMM, 靜壓mmAq } = formData;

    // 確保所有數值都有效
    const l = Number(長度) || 0;
    const w = Number(寬度) || 0;
    const h = Number(高度) || 0;
    const hp = Number(馬力HP) || 0;
    const flow = Number(風量NCMM) || 0;
    const pressure = Number(靜壓mmAq) || 0;

    // 只有當所有必要的尺寸都有值時才進行計算
    if (l && w && h) {
      // 計算基本幾何特徵
      const volume = l * w * h;
      
      // 計算各種效率和比率
      const powerDensity = volume !== 0 ? (hp / volume).toFixed(6) : '0';
      const flowEfficiency = hp !== 0 ? (flow / hp).toFixed(6) : '0';
      const pressureEfficiency = hp !== 0 ? (pressure / hp).toFixed(6) : '0';
      const lengthWidthRatio = w !== 0 ? (l / w).toFixed(6) : '0';
      const heightWidthRatio = w !== 0 ? (h / w).toFixed(6) : '0';

      // 檢查是否有實際變化
      const newValues = {
        體積: volume.toString(),
        功率密度: powerDensity,
        風量效率: flowEfficiency,
        壓力效率: pressureEfficiency,
        長寬比: lengthWidthRatio,
        高寬比: heightWidthRatio
      };

      // 檢查是否有任何值真的改變了
      const hasChanges = Object.keys(newValues).some(
        key => newValues[key] !== formData[key]
      );

      // 只有在值真的改變時才更新
      if (hasChanges) {
        setFormData(prev => ({
          ...prev,
          ...newValues
        }));
      }
    }
  }, [formData.長度, formData.寬度, formData.高度, formData.馬力HP, formData.風量NCMM, formData.靜壓mmAq]);

  // 修改 handleInputChange 來處理數值顯示
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    // 如果是 range 類型，轉換為數值
    const newValue = type === 'range' ? parseFloat(value) : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue.toString()
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorOriginal(null);
    setPredictedPriceOriginal(null);

    // --- 原始模型的請求準備 ---
    const originalModelFields = [
      "長度", "寬度", "高度", "靜壓mmAq", "馬力HP", "風量NCMM", 
      "操作溫度°C", "採購數量", "葉輪直徑mm",
      "系列", "規格", "型號",
      "出口⽅向", "機殼材質", "架台材質",
      "產品名稱", "驅動方式", "防火花級", "單雙吸", "風機等級",
      "體積", "功率密度", "風量效率", "壓力效率", "長寬比", "高寬比"
    ];

    const originalNumericFields = [
      '長度', '寬度', '高度', '靜壓mmAq', '馬力HP', '風量NCMM', 
      '操作溫度°C', '採購數量', '葉輪直徑mm',
      '體積', '功率密度', '風量效率', '壓力效率', '長寬比', '高寬比'
    ];

    let originalFilteredData = {};
    originalModelFields.forEach(field => {
      const isNumeric = originalNumericFields.includes(field);
      let value;
      
      if (field === '型號') {
        value = formData['規格'];
      } else {
        value = field in formData 
          ? (isNumeric ? parseFloat(formData[field]) || 0 : formData[field])
          : (isNumeric ? 0 : '');
      }
      
      originalFilteredData[field] = [value];
    });
    
    const originalRequest = axios.post(`${API_BASE_URL}${API_ENDPOINTS.predict}`, originalFilteredData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: false,
    });


    try {
      const [originalResult] = await Promise.allSettled([
        originalRequest
      ]);

      // 準備儲存查詢結果的資料
      let resultData = {
        id: Date.now() + Math.random(), // 唯一識別碼
        timestamp: Date.now(),
        ...formData, // 包含所有表單資料
        predictedPriceOriginal: null,
        errorOriginal: null
      };

      // 處理原始模型的回應
      if (originalResult.status === 'fulfilled') {
        console.log('收到原始模型的回應:', originalResult.value);
        if (originalResult.value?.data?.預測價格) {
          const priceStr = originalResult.value.data.預測價格.replace(/[^\d.]/g, '');
          const price = parseFloat(priceStr);
          if (!isNaN(price)) {
            const roundedPrice = Math.round(price);
            setPredictedPriceOriginal(roundedPrice);
            resultData.predictedPriceOriginal = roundedPrice;
          } else {
            const errorMsg = '原始模型：無法解析預測價格';
            setErrorOriginal(errorMsg);
            resultData.errorOriginal = errorMsg;
          }
        } else {
          const errorMsg = '原始模型：回應資料格式不正確';
          setErrorOriginal(errorMsg);
          resultData.errorOriginal = errorMsg;
        }
      } else {
        console.error('原始模型預測失敗:', originalResult.reason);
        let errorMessage = '原始模型：預測失敗，請稍後再試！';
        if (originalResult.reason.code === 'ERR_NETWORK') {
          errorMessage = '原始模型：API 伺服器連線失敗，請確認伺服器是否正在運行！';
        } else if (originalResult.reason.response?.data?.錯誤) {
          errorMessage = `原始模型：伺服器錯誤: ${originalResult.reason.response.data.錯誤}`;
        } else if (originalResult.reason.response) {
          errorMessage = `原始模型：伺服器錯誤 (${originalResult.reason.response.status}): ${originalResult.reason.response.data?.訊息 || '未知錯誤'}`;
        }
        setErrorOriginal(errorMessage);
        resultData.errorOriginal = errorMessage;
      }


      // 將查詢結果加入到結果列表中（最新的在最前面），最多保持5筆記錄
      setQueryResults(prevResults => {
        const newResults = [resultData, ...prevResults];
        // 如果超過5筆，只保留最新的5筆
        return newResults.length > 5 ? newResults.slice(0, 5) : newResults;
      });

    } catch (error) {
      // 這裡的 catch 主要是處理 Promise.allSettled 本身的錯誤，而不是個別請求的錯誤
      console.error('處理預測結果時發生錯誤:', error);
      setErrorOriginal('處理預測結果時發生錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (typeof num !== 'number') return num; // 如果不是數字，直接返回
    return new Intl.NumberFormat('zh-TW').format(num);
  };

  const handleScannedData = (data) => {
    setFormData(prevData => ({
      ...prevData,
      ...data
    }));
  };

  const handleRemoveResult = (resultId) => {
    setQueryResults(prevResults => 
      prevResults.filter(result => result.id !== resultId)
    );
  };

  return (
    <IPCheck>
      <header className="header py-3 bg-white border-bottom">
        <div className="container-fluid d-flex justify-content-center">
          <div className="d-flex align-items-center">
            <img src="/logo.svg" alt="久朝機殼" className="me-3" style={{maxHeight: '50px'}} />
            <h1 className="h3 mb-0">久朝機殼圖面生產價格預測系統</h1>
          </div>
        </div>
      </header>

      <div className="container-fluid py-4" style={{ paddingBottom: '2rem' }}>
        <div className="row">
          <div className="col-12 col-lg-8">
            <Scan onDataScanned={handleScannedData} />
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {/* 智能尺寸輸入 */}
                <div className="col-md-4 col-sm-6 col-12">
                  <SmartDimensionInput
                    name="長度"
                    label="長度"
                    value={formData.長度}
                    onChange={handleInputChange}
                    required={true}
                  />
                </div>
                <div className="col-md-4 col-sm-6 col-12">
                  <SmartDimensionInput
                    name="寬度"
                    label="寬度"
                    value={formData.寬度}
                    onChange={handleInputChange}
                    required={true}
                  />
                </div>
                <div className="col-md-4 col-sm-6 col-12">
                  <SmartDimensionInput
                    name="高度"
                    label="高度"
                    value={formData.高度}
                    onChange={handleInputChange}
                    required={true}
                  />
                </div>
                <div className="col-md-4 col-sm-6 col-12">
                  <label htmlFor="靜壓mmAq" className="form-label">靜壓 (mmAq)</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input type="range" style={{ flex: '1' }} id="靜壓mmAq-range" name="靜壓mmAq" min={numericLimits.靜壓mmAq.min} max={numericLimits.靜壓mmAq.max} step={numericLimits.靜壓mmAq.step} value={formData.靜壓mmAq} onChange={handleInputChange} />
                    <input type="number" style={{ width: '100px', minWidth: '100px', textAlign: 'right' }} id="靜壓mmAq" name="靜壓mmAq" value={formData.靜壓mmAq} onChange={handleInputChange} min={numericLimits.靜壓mmAq.min} max={numericLimits.靜壓mmAq.max} step={numericLimits.靜壓mmAq.step} required />
                  </div>
                </div>
                <div className="col-md-4 col-sm-6 col-12">
                  <label htmlFor="馬力HP" className="form-label">馬力 (HP)</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input type="range" style={{ flex: '1' }} id="馬力HP-range" name="馬力HP" min={numericLimits.馬力HP.min} max={numericLimits.馬力HP.max} step={numericLimits.馬力HP.step} value={formData.馬力HP} onChange={handleInputChange} />
                    <input type="number" style={{ width: '100px', minWidth: '100px', textAlign: 'right' }} id="馬力HP" name="馬力HP" value={formData.馬力HP} onChange={handleInputChange} min={numericLimits.馬力HP.min} max={numericLimits.馬力HP.max} step={numericLimits.馬力HP.step} required />
                  </div>
                </div>
                <div className="col-md-4 col-sm-6 col-12">
                  <label htmlFor="風量NCMM" className="form-label">風量 (NCMM)</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input type="range" style={{ flex: '1' }} id="風量NCMM-range" name="風量NCMM" min={numericLimits.風量NCMM.min} max={numericLimits.風量NCMM.max} step={numericLimits.風量NCMM.step} value={formData.風量NCMM} onChange={handleInputChange} />
                    <input type="number" style={{ width: '100px', minWidth: '100px', textAlign: 'right' }} id="風量NCMM" name="風量NCMM" value={formData.風量NCMM} onChange={handleInputChange} min={numericLimits.風量NCMM.min} max={numericLimits.風量NCMM.max} step={numericLimits.風量NCMM.step} required />
                  </div>
                </div>
                <div className="col-md-4 col-sm-6 col-12">
                  <label htmlFor="操作溫度°C" className="form-label">操作溫度 (°C)</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input type="range" style={{ flex: '1' }} id="操作溫度°C-range" name="操作溫度°C" min={numericLimits['操作溫度°C'].min} max={numericLimits['操作溫度°C'].max} step={numericLimits['操作溫度°C'].step} value={formData['操作溫度°C']} onChange={handleInputChange} />
                    <input type="number" style={{ width: '100px', minWidth: '100px', textAlign: 'right' }} id="操作溫度°C" name="操作溫度°C" value={formData['操作溫度°C']} onChange={handleInputChange} min={numericLimits['操作溫度°C'].min} max={numericLimits['操作溫度°C'].max} step={numericLimits['操作溫度°C'].step} required />
                  </div>
                </div>
                <div className="col-md-4 col-sm-6 col-12">
                  <label htmlFor="採購數量" className="form-label">採購數量</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input type="range" style={{ flex: '1' }} id="採購數量-range" name="採購數量" min={numericLimits.採購數量.min} max={numericLimits.採購數量.max} step={numericLimits.採購數量.step} value={formData.採購數量} onChange={handleInputChange} />
                    <input type="number" style={{ width: '100px', minWidth: '100px', textAlign: 'right' }} id="採購數量" name="採購數量" value={formData.採購數量} onChange={handleInputChange} min={numericLimits.採購數量.min} max={numericLimits.採購數量.max} step={numericLimits.採購數量.step} required />
                  </div>
                </div>
                <div className="col-md-4 col-sm-6 col-12">
                  <label htmlFor="葉輪直徑mm" className="form-label">葉輪直徑 (mm)</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input type="range" style={{ flex: '1' }} id="葉輪直徑mm-range" name="葉輪直徑mm" min={numericLimits['葉輪直徑mm'].min} max={numericLimits['葉輪直徑mm'].max} step={numericLimits['葉輪直徑mm'].step} value={formData['葉輪直徑mm']} onChange={handleInputChange} />
                    <input type="number" style={{ width: '100px', minWidth: '100px', textAlign: 'right' }} id="葉輪直徑mm" name="葉輪直徑mm" value={formData['葉輪直徑mm']} onChange={handleInputChange} min={numericLimits['葉輪直徑mm'].min} max={numericLimits['葉輪直徑mm'].max} step={numericLimits['葉輪直徑mm'].step} required />
                  </div>
                </div>

                {Object.keys(dropdownOptions).map((key, index) => (
                  <div className="col-md-4 col-sm-6 col-12" key={key}>
                    <label htmlFor={key} className="form-label">{key}</label>
                    <select className="form-select" id={key} name={key} value={formData[key]} onChange={handleInputChange} required>
                      <option value="">請選擇...</option>
                      {dropdownOptions[key].map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                ))}
                <button type="submit" style={{ display: 'none' }}></button>
              </div>
            </form>
          </div>

          <div className="col-12 col-lg-4">
            <div className="bg-white p-4 rounded shadow h-100">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0">預測價格</h4>
                <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      計算中...
                    </>
                  ) : '計算預測價格'}
                </button>
              </div>
              
              {/* 預測價格結果 */}
              {predictedPriceOriginal && (
                <div className="alert alert-success text-center mb-4">
                  <h3 className="mb-0">
                    NT$ {formatNumber(predictedPriceOriginal)} 元
                  </h3>
                </div>
              )}
              {errorOriginal && (
                <div className="alert alert-danger mb-4">
                  {errorOriginal}
                </div>
              )}
              
              {/* 查詢結果表格 */}
              <ResultsTable 
                results={queryResults} 
                onRemoveResult={handleRemoveResult}
                currentFormData={formData}
                onUpdateFormData={setFormData}
              />
            </div>
          </div>
        </div>
      </div>

      <footer className="footer mt-auto py-3 bg-light">
        <div className="container-fluid text-center">
          <span className="text-muted">
            V1.0 2025.4.7 | Copyright © 2025 Chiuchau Inc. All rights reserved.
          </span>
        </div>
      </footer>
    </IPCheck>
  );
}

export default App;
