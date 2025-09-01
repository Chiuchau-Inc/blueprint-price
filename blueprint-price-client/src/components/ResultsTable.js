import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';

const ResultsTable = ({ results = [], onRemoveResult, currentFormData = {}, onUpdateFormData }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '-';
    if (typeof num !== 'number' && typeof num !== 'string') return '-';
    const number = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(number)) return '-';
    // 如果是0，直接顯示0，不要顯示成 '-'
    if (number === 0) return '0';
    return new Intl.NumberFormat('zh-TW').format(number);
  };

  const formatVolume = (volume) => {
    if (volume === null || volume === undefined || volume === '') return '-';
    const num = typeof volume === 'string' ? parseFloat(volume) : volume;
    if (isNaN(num) || num === 0) return '-';
    
    // 將 mm³ 轉換為 m³ (除以 1,000,000,000)
    const volumeInM3 = num / 1000000000;
    if (volumeInM3 >= 1) {
      return `${volumeInM3.toFixed(2)} m³`;
    }
    
    // 將 mm³ 轉換為 dm³ (公升) (除以 1,000,000)
    const volumeInDM3 = num / 1000000;
    if (volumeInDM3 >= 1) {
      return `${volumeInDM3.toFixed(1)} dm³`;
    }
    
    // 將 mm³ 轉換為 cm³ (除以 1,000)
    const volumeInCM3 = num / 1000;
    return `${volumeInCM3.toFixed(0)} cm³`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 計算匹配度分數
  const calculateMatchScore = (item, formData) => {
    let score = 0;
    let totalFields = 0;

    // 數值欄位匹配 (權重較高)
    const numericFields = [
      { form: '長度', db: 'length', weight: 3 },
      { form: '寬度', db: 'width', weight: 3 },
      { form: '高度', db: 'height', weight: 3 },
      { form: '靜壓mmAq', db: 'static_pressure_mmaq', weight: 2 },
      { form: '馬力HP', db: 'horsepower_hp', weight: 2 },
      { form: '風量NCMM', db: 'airflow_ncmm', weight: 2 }
    ];

    numericFields.forEach(field => {
      if (formData[field.form] && item[field.db]) {
        const formValue = parseFloat(formData[field.form]);
        const itemValue = parseFloat(item[field.db]);
        if (!isNaN(formValue) && !isNaN(itemValue)) {
          // 計算相對差異百分比
          const diff = Math.abs(formValue - itemValue) / Math.max(formValue, itemValue);
          // 差異小於10%得滿分，差異越大分數越低
          const fieldScore = Math.max(0, (1 - diff * 2)) * field.weight;
          score += fieldScore;
          totalFields += field.weight;
        }
      }
    });

    // 文字欄位匹配 (權重較低但重要)
    const textFields = [
      { form: '產品名稱', db: 'product_name', weight: 2 },
      { form: '機殼材質', db: 'casing_material', weight: 1 },
      { form: '架台材質', db: 'frame_material', weight: 1 },
      { form: '規格', db: 'specification', weight: 1 },
      { form: '出口⽅向', db: 'outlet_direction', weight: 1 },
      { form: '驅動方式', db: 'drive_method', weight: 1 }
    ];

    textFields.forEach(field => {
      if (formData[field.form] && item[field.db]) {
        if (formData[field.form].toString().toLowerCase() === item[field.db].toString().toLowerCase()) {
          score += field.weight;
        }
        totalFields += field.weight;
      }
    });

    // 返回百分比分數 (0-100)
    return totalFields > 0 ? (score / totalFields) * 100 : 0;
  };

  const fetchHistoryData = async (formData = currentFormData) => {
    try {
      // 準備搜尋參數
      const searchParams = {
        length: formData.長度,
        width: formData.寬度,
        height: formData.高度,
        static_pressure: formData.靜壓mmAq,
        horsepower: formData.馬力HP,
        airflow: formData.風量NCMM,
        impeller_diameter: formData['葉輪直徑mm'],
        material: formData.機殼材質,
        casing_material: formData.機殼材質,
        frame_material: formData.架台材質,
        product_name: formData.產品名稱,
        model: formData.規格,
        outlet_direction: formData['出口⽅向'],
        drive_method: formData.驅動方式
      };

      // 移除空值
      const filteredParams = Object.entries(searchParams)
        .filter(([key, value]) => value && value !== '')
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});

      const queryString = new URLSearchParams(filteredParams).toString();
      const url = buildApiUrl(API_ENDPOINTS.history, queryString);
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
        // 使用原始查詢條件計算匹配度，而不是當前表單數據
        const formDataForMatching = Object.keys(originalFormData).length > 0 ? originalFormData : formData;
        const dataWithScores = data.map(item => ({
          ...item,
          matchScore: calculateMatchScore(item, formDataForMatching)
        }));
        
        // 按匹配度降序排序
        const sortedData = dataWithScores.sort((a, b) => b.matchScore - a.matchScore);
        
        setHistoryData(sortedData);
        setShowHistory(true);
        
        // 保存查詢條件
        if (Object.keys(originalFormData).length === 0) {
          setOriginalFormData(formData);
        }
      }
    } catch (error) {
      console.error('獲取歷史價格失敗:', error);
    }
  };

  // 使用指定的表單數據進行匹配度計算的查詢函數
  const fetchHistoryDataWithFormData = async (formDataForMatching) => {
    try {
      // 準備搜尋參數
      const searchParams = {
        length: formDataForMatching.長度,
        width: formDataForMatching.寬度,
        height: formDataForMatching.高度,
        static_pressure: formDataForMatching.靜壓mmAq,
        horsepower: formDataForMatching.馬力HP,
        airflow: formDataForMatching.風量NCMM,
        impeller_diameter: formDataForMatching['葉輪直徑mm'],
        material: formDataForMatching.機殼材質,
        casing_material: formDataForMatching.機殼材質,
        frame_material: formDataForMatching.架台材質,
        product_name: formDataForMatching.產品名稱,
        model: formDataForMatching.規格,
        outlet_direction: formDataForMatching['出口⽅向'],
        drive_method: formDataForMatching.驅動方式
      };

      // 移除空值
      const filteredParams = Object.entries(searchParams)
        .filter(([key, value]) => value && value !== '')
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});

      const queryString = new URLSearchParams(filteredParams).toString();
      const url = buildApiUrl(API_ENDPOINTS.history, queryString);
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
        // 直接使用傳入的表單數據計算匹配度
        const dataWithScores = data.map(item => ({
          ...item,
          matchScore: calculateMatchScore(item, formDataForMatching)
        }));
        
        // 按匹配度降序排序
        const sortedData = dataWithScores.sort((a, b) => b.matchScore - a.matchScore);
        
        setHistoryData(sortedData);
        setShowHistory(true);
      }
    } catch (error) {
      console.error('獲取歷史價格失敗:', error);
    }
  };

  // 保存原始查詢條件，避免選擇記錄後重新查詢導致匹配度錯誤
  const [originalFormData, setOriginalFormData] = useState({});
  const [selectedRecordPrice, setSelectedRecordPrice] = useState(null);
  
  // 當表單數據改變時自動更新歷史數據（僅在已顯示狀態下且不是選擇記錄觸發的變更）
  useEffect(() => {
    if (showHistory && !selectedRecord) {
      fetchHistoryData(currentFormData);
      setOriginalFormData(currentFormData);
    }
  }, [currentFormData, showHistory, selectedRecord]);

  // 處理選擇歷史記錄並更新表單
  const handleSelectHistoryRecord = (item) => {
    // 設置選中的記錄用於顯示
    setSelectedRecord(item);
    // 保存選中記錄的價格信息
    setSelectedRecordPrice({
      price: item.unit_price,
      date: item.purchase_date,
      productName: item.product_name,
      specification: item.specification,
      model: item.model
    });
    
    if (onUpdateFormData) {
      const newFormData = {
        長度: item.length || '',
        寬度: item.width || '',
        高度: item.height || '',
        靜壓mmAq: item.static_pressure_mmaq || '',
        馬力HP: item.horsepower_hp || '',
        風量NCMM: item.airflow_ncmm || '',
        '操作溫度°C': item.operating_temperature_c || '',
        採購數量: item.purchase_quantity || '',
        葉輪直徑mm: item.impeller_diameter_mm || '',
        系列: item.model || '',
        規格: item.specification || '',
        '出口⽅向': item.outlet_direction || '',
        機殼材質: item.casing_material || 'SS400',
        架台材質: item.frame_material || 'SS400',
        產品名稱: item.product_name || '',
        驅動方式: item.drive_method || '',
        防火花級: item.fire_spark_level || '',
        單雙吸: item.single_double_suction || '',
        風機等級: item.fan_grade || ''
      };
      onUpdateFormData(newFormData);
    }
  };

  // 基於選中條件再次查詢歷史價格
  const handleQueryAgainWithSelectedCondition = async () => {
    if (selectedRecord) {
      const selectedFormData = {
        長度: selectedRecord.length || '',
        寬度: selectedRecord.width || '',
        高度: selectedRecord.height || '',
        靜壓mmAq: selectedRecord.static_pressure_mmaq || '',
        馬力HP: selectedRecord.horsepower_hp || '',
        風量NCMM: selectedRecord.airflow_ncmm || '',
        '操作溫度°C': selectedRecord.operating_temperature_c || '',
        採購數量: selectedRecord.purchase_quantity || '',
        葉輪直徑mm: selectedRecord.impeller_diameter_mm || '',
        系列: selectedRecord.model || '',
        規格: selectedRecord.specification || '',
        '出口⽅向': selectedRecord.outlet_direction || '',
        機殼材質: selectedRecord.casing_material || 'SS400',
        架台材質: selectedRecord.frame_material || 'SS400',
        產品名稱: selectedRecord.product_name || '',
        驅動方式: selectedRecord.drive_method || '',
        防火花級: selectedRecord.fire_spark_level || '',
        單雙吸: selectedRecord.single_double_suction || '',
        風機等級: selectedRecord.fan_grade || ''
      };
      
      // 重置原始表單數據以便重新計算匹配度
      setOriginalFormData(selectedFormData);
      // 修改 fetchHistoryData 調用以直接使用 selectedFormData 進行匹配度計算
      await fetchHistoryDataWithFormData(selectedFormData);
    }
  };

  return (
    <div className="results-table-container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <strong className="text-primary">查詢結果訂價詢單列表：</strong>
        <small className="text-muted">最多顯示 5 筆記錄</small>
      </div>
      
      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="table-dark">
            <tr>
              <th scope="col">廠商簡稱</th>
              <th scope="col">訂單編號</th>
              <th scope="col">單體</th>
              <th scope="col">長度</th>
              <th scope="col">寬度</th>
              <th scope="col">高度</th>
              <th scope="col">體積</th>
              <th scope="col">品名</th>
              <th scope="col">型號</th>
              <th scope="col">規格</th>
              <th scope="col">出口方向</th>
              <th scope="col">材質</th>
              <th scope="col">機殼材質</th>
              <th scope="col">架台材質</th>
              <th scope="col">產品名稱</th>
              <th scope="col">靜壓</th>
              <th scope="col">馬力</th>
              <th scope="col">風量</th>
              <th scope="col">預測價格</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => {
              const safeFormatNumber = (value) => {
                const formatted = formatNumber(value);
                return formatted === '-' ? '-' : formatted;
              };
              
              return (
              <tr key={result.id || index}>
                <td>{result.廠商簡稱 || '栓揚有限'}</td>
                <td>{result.訂單編號 || `OC${String(400000 + index + 1).padStart(6, '0')}`}</td>
                <td>{safeFormatNumber(result.採購數量) !== '-' ? safeFormatNumber(result.採購數量) : '1'}</td>
                <td>{safeFormatNumber(result.長度)}</td>
                <td>{safeFormatNumber(result.寬度)}</td>
                <td>{safeFormatNumber(result.高度)}</td>
                <td>{formatVolume(result.體積)}</td>
                <td>{result.品名 || result.產品名稱 || '-'}</td>
                <td>{result.型號 || result.系列 || '-'}</td>
                <td>{result.規格 || '-'}</td>
                <td>{result['出口方向'] || result['出口⽅向'] || '-'}</td>
                <td>{result.材質 || result.機殼材質 || 'SS400'}</td>
                <td>{result.機殼材質 || 'SS400'}</td>
                <td>{result.架台材質 || 'SS400'}</td>
                <td>{result.產品名稱 || '-'}</td>
                <td>{safeFormatNumber(result.靜壓mmAq)}</td>
                <td>{safeFormatNumber(result.馬力HP)}</td>
                <td>{safeFormatNumber(result.風量NCMM)}</td>
                <td className="text-success fw-bold">
                  {result.predictedPriceOriginal ? 
                    safeFormatNumber(result.predictedPriceOriginal) : 
                    (result.errorOriginal || '-')
                  }
                </td>
                <td>
                  <button 
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => onRemoveResult && onRemoveResult(result.id || index)}
                    title="刪除此記錄"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
              );
            })}
            
            {/* 預留空白行，總共顯示5行 */}
            {results.length < 5 && Array.from({ length: 5 - results.length }, (_, index) => (
              <tr key={`empty-${index}`} className="table-placeholder">
                <td colSpan="20" className="text-center text-muted">
                  {results.length === 0 && index === 0 ? '尚無查詢記錄 - 計算預測價格後將顯示結果' : ''}
                  {results.length === 0 && index > 0 ? '' : ''}
                  {results.length > 0 ? '' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* 歷史價格按鈕 */}
      <div className="d-flex justify-content-end mt-3 mb-3">
        <button 
          className="btn btn-primary"
          onClick={() => {
            setOriginalFormData({});
            setSelectedRecord(null);
            setSelectedRecordPrice(null);
            fetchHistoryData();
          }}
        >
          查看歷史價格
        </button>
        {showHistory && (
          <button 
            className="btn btn-outline-secondary ms-2"
            onClick={() => setShowHistory(false)}
          >
            隱藏歷史
          </button>
        )}
      </div>
      
      {/* 歷史價格表格 */}
      {showHistory && (
        <div className="history-table-container mt-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <strong className="text-success">歷史價格記錄：</strong>
            <small className="text-muted">共 {historyData.length} 筆記錄</small>
          </div>
          
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-success">
                <tr>
                  <th scope="col">廠商簡稱</th>
                  <th scope="col">訂單編號</th>
                  <th scope="col">單體</th>
                  <th scope="col">長度</th>
                  <th scope="col">寬度</th>
                  <th scope="col">高度</th>
                  <th scope="col">體積</th>
                  <th scope="col">品名</th>
                  <th scope="col">型號</th>
                  <th scope="col">規格</th>
                  <th scope="col">出口方向</th>
                  <th scope="col">材質</th>
                  <th scope="col">機殼材質</th>
                  <th scope="col">架台材質</th>
                  <th scope="col">產品名稱</th>
                  <th scope="col">靜壓</th>
                  <th scope="col">馬力</th>
                  <th scope="col">風量</th>
                  <th scope="col">歷史價格</th>
                  <th scope="col">匹配度</th>
                  <th scope="col">採購日期</th>
                  <th scope="col">操作</th>
                </tr>
              </thead>
              <tbody>
                {historyData.map((item, index) => {
                  const safeFormatNumber = (value) => {
                    const formatted = formatNumber(value);
                    return formatted === '-' ? '-' : formatted;
                  };
                  
                  return (
                    <tr key={`${item.order_number || 'unknown'}-${item.created_at || item.purchase_date || index}`}>
                      <td>{item.vendor_name || '-'}</td>
                      <td>{item.order_number || '-'}</td>
                      <td>{safeFormatNumber(item.purchase_quantity) !== '-' ? safeFormatNumber(item.purchase_quantity) : '1'}</td>
                      <td>{safeFormatNumber(item.length)}</td>
                      <td>{safeFormatNumber(item.width)}</td>
                      <td>{safeFormatNumber(item.height)}</td>
                      <td>{formatVolume(item.volume)}</td>
                      <td>{item.product_name || '-'}</td>
                      <td>{item.model || '-'}</td>
                      <td>{item.specification || '-'}</td>
                      <td>{item.outlet_direction || '-'}</td>
                      <td>{item.material || 'SS400'}</td>
                      <td>{item.casing_material || 'SS400'}</td>
                      <td>{item.frame_material || 'SS400'}</td>
                      <td>{item.product_name || '-'}</td>
                      <td>{safeFormatNumber(item.static_pressure_mmaq)}</td>
                      <td>{safeFormatNumber(item.horsepower_hp)}</td>
                      <td>{safeFormatNumber(item.airflow_ncmm)}</td>
                      <td className="text-primary fw-bold">
                        {safeFormatNumber(item.unit_price)}
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="progress me-2" style={{ width: '60px', height: '8px' }}>
                            <div 
                              className={`progress-bar ${
                                item.matchScore >= 80 ? 'bg-success' : 
                                item.matchScore >= 60 ? 'bg-warning' : 'bg-danger'
                              }`}
                              style={{ width: `${Math.max(item.matchScore, 5)}%` }}
                            ></div>
                          </div>
                          <small className="text-muted">{Math.round(item.matchScore)}%</small>
                        </div>
                      </td>
                      <td>{item.purchase_date ? formatDate(item.purchase_date) : '-'}</td>
                      <td>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => handleSelectHistoryRecord(item)}
                          title="使用此記錄填入表單"
                        >
                          選擇
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* 選中記錄顯示區域 */}
          {selectedRecord && (
            <div className="selected-record-display mt-4 p-3 border rounded bg-light">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <strong className="text-info">已選擇記錄：</strong>
                <div>
                  <button 
                    className="btn btn-sm btn-primary me-2"
                    onClick={handleQueryAgainWithSelectedCondition}
                    title="依此條件再次查詢歷史價格"
                  >
                    再次查詢
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      setSelectedRecord(null);
                      setSelectedRecordPrice(null);
                    }}
                  >
                    清除選擇
                  </button>
                </div>
              </div>
              <div className="row">
                <div className="col-12 mb-3">
                  <h5 className="text-primary mb-2">{selectedRecord.product_name || '未指定產品'}</h5>
                  <div className="row">
                    <div className="col-sm-6">
                      <small className="text-muted">型號規格</small>
                      <div>{selectedRecord.model || '-'} / {selectedRecord.specification || '-'}</div>
                    </div>
                    <div className="col-sm-6">
                      <small className="text-muted">尺寸 (長×寬×高)</small>
                      <div>{formatNumber(selectedRecord.length)} × {formatNumber(selectedRecord.width)} × {formatNumber(selectedRecord.height)} mm</div>
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="price-display text-center p-3 bg-white rounded border">
                    <small className="text-muted d-block mb-2">已保留的歷史價格資訊</small>
                    <div className="display-4 text-success fw-bold mb-2">
                      ${formatNumber(selectedRecord.unit_price)}
                    </div>
                    <small className="text-muted">
                      {selectedRecord.purchase_date ? formatDate(selectedRecord.purchase_date) : ''}
                    </small>
                    <div className="mt-2">
                      <small className="badge bg-info">價格已保留 - 可繼續查詢其他條件</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultsTable;