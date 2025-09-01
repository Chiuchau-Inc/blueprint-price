import React, { useState, useEffect } from 'react';

const SmartDimensionInput = ({ 
  name, 
  label, 
  value, 
  onChange, 
  required = false 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [unit, setUnit] = useState('mm');
  const [warning, setWarning] = useState('');
  const [suggestion, setSuggestion] = useState('');

  // 單位轉換係數 (轉為 mm)
  const unitConversions = {
    'mm': 1,
    'cm': 10,
    'm': 1000
  };

  // 合理範圍定義
  const reasonableRanges = {
    '長度': { min: 100, max: 5000, typical: [800, 3000] },
    '寬度': { min: 100, max: 5000, typical: [600, 2500] },
    '高度': { min: 100, max: 4000, typical: [500, 2000] }
  };

  // 從 mm 值初始化顯示
  useEffect(() => {
    if (value && !isNaN(value)) {
      const mmValue = parseFloat(value);
      
      // 智能選擇最佳單位
      if (mmValue >= 1000) {
        setUnit('m');
        setInputValue((mmValue / 1000).toString());
      } else if (mmValue >= 100) {
        setUnit('cm');
        setInputValue((mmValue / 10).toString());
      } else {
        setUnit('mm');
        setInputValue(mmValue.toString());
      }
    }
  }, [value]);

  // 處理輸入值變化
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (newValue && !isNaN(newValue)) {
      const numValue = parseFloat(newValue);
      const mmValue = numValue * unitConversions[unit];
      
      // 檢查範圍和提供建議
      checkValueAndSuggest(mmValue);
      
      // 回傳 mm 值給父組件
      onChange({
        target: {
          name: name,
          value: mmValue.toString()
        }
      });
    } else {
      setWarning('');
      setSuggestion('');
      onChange({
        target: {
          name: name,
          value: ''
        }
      });
    }
  };

  // 處理單位變化
  const handleUnitChange = (e) => {
    const newUnit = e.target.value;
    
    if (inputValue && !isNaN(inputValue)) {
      const currentMmValue = parseFloat(inputValue) * unitConversions[unit];
      const newDisplayValue = currentMmValue / unitConversions[newUnit];
      setInputValue(newDisplayValue.toString());
      
      // 立即更新到父組件
      onChange({
        target: {
          name: name,
          value: currentMmValue.toString()
        }
      });
    }
    
    setUnit(newUnit);
  };

  // 檢查數值並提供建議
  const checkValueAndSuggest = (mmValue) => {
    const ranges = reasonableRanges[label];
    if (!ranges) return;

    setWarning('');
    setSuggestion('');

    if (mmValue < ranges.min) {
      setWarning(`${label}似乎太小，一般${label}至少 ${ranges.min}mm`);
    } else if (mmValue > ranges.max && mmValue < 50000) {
      setWarning(`${label}較大，請確認是否正確`);
      setSuggestion(`常見${label}範圍: ${ranges.typical[0]}-${ranges.typical[1]}mm`);
    } else if (mmValue >= 50000) {
      setWarning('⚠️ 數值異常大，可能是輸入錯誤');
      setSuggestion(`建議檢查單位是否正確，常見${label}: ${ranges.typical[0]}-${ranges.typical[1]}mm`);
    } else if (mmValue >= ranges.typical[0] && mmValue <= ranges.typical[1]) {
      setSuggestion(`✓ ${label}在常見範圍內`);
    }
  };

  // 快速填入常用值
  const quickFillOptions = {
    '長度': [800, 1000, 1200, 1500, 2000, 2500],
    '寬度': [600, 800, 900, 1200, 1600, 2000],
    '高度': [500, 600, 700, 900, 1200, 1500]
  };

  const handleQuickFill = (mmValue) => {
    // 根據當前單位調整顯示值
    const displayValue = mmValue / unitConversions[unit];
    setInputValue(displayValue.toString());
    
    onChange({
      target: {
        name: name,
        value: mmValue.toString()
      }
    });
    
    checkValueAndSuggest(mmValue);
  };

  return (
    <div className="smart-dimension-input">
      <label htmlFor={name} className="form-label">
        {label} 
        {required && <span className="text-danger">*</span>}
      </label>
      
      {/* 主要輸入區域 */}
      <div className="d-flex align-items-center">
        <input
          type="number"
          className={`form-control ${warning ? 'border-warning' : ''}`}
          id={name}
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={`輸入${label}`}
          step="0.1"
          min="0"
          required={required}
          style={{ flex: '0 1 70%' }}
        />
        <select 
          className="form-select ms-2" 
          style={{ flex: '0 1 30%', minWidth: '70px' }}
          value={unit}
          onChange={handleUnitChange}
        >
          <option value="mm">mm</option>
          <option value="cm">cm</option>
          <option value="m">m</option>
        </select>
      </div>

      {/* 警告和建議訊息 */}
      {warning && (
        <div className={`mt-1 small ${warning.includes('⚠️') ? 'text-danger' : 'text-warning'}`}>
          {warning}
        </div>
      )}
      
      {suggestion && (
        <div className={`mt-1 small ${suggestion.includes('✓') ? 'text-success' : 'text-info'}`}>
          {suggestion}
        </div>
      )}

      {/* 快速填入選項 */}
      {quickFillOptions[label] && (
        <div className="mt-2">
          <small className="text-muted">常用尺寸:</small>
          <div className="d-flex flex-wrap gap-1 mt-1">
            {quickFillOptions[label].map(size => (
              <button
                key={size}
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => handleQuickFill(size)}
                style={{ fontSize: '0.75rem', padding: '0.125rem 0.25rem' }}
              >
                {size}mm
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 範圍提示 */}
      <div className="mt-1">
        <small className="text-muted">
          建議範圍: {reasonableRanges[label]?.typical[0]}-{reasonableRanges[label]?.typical[1]}mm
        </small>
      </div>
    </div>
  );
};

export default SmartDimensionInput;