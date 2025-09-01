import { GoogleGenerativeAI } from '@google/generative-ai';
import { useState, useEffect } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';

// 設置 worker
GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js`;

const PdfIcon = () => (
  <svg
    fill="#000000"
    height="64px"
    width="64px"
    version="1.1"
    viewBox="0 0 482.14 482.14"
  >
    <g>
      <path d="M142.024,310.194c0-8.007-5.556-12.782-15.359-12.782c-4.003,0-6.714,0.395-8.132,0.773v25.69
        c1.679,0.378,3.743,0.504,6.588,0.504C135.57,324.379,142.024,319.1,142.024,310.194z"/>
      <path d="M202.709,297.681c-4.39,0-7.227,0.379-8.905,0.772v56.896c1.679,0.394,4.39,0.394,6.841,0.394
        c17.809,0.126,29.424-9.677,29.424-30.449C230.195,307.231,219.611,297.681,202.709,297.681z"/>
      <path d="M315.458,0H121.811c-28.29,0-51.315,23.041-51.315,51.315v189.754h-5.012c-11.418,0-20.678,9.251-20.678,20.679v125.404
        c0,11.427,9.259,20.677,20.678,20.677h5.012v22.995c0,28.305,23.025,51.315,51.315,51.315h264.223
        c28.272,0,51.3-23.011,51.3-51.315V121.449L315.458,0z M99.053,284.379c6.06-1.024,14.578-1.796,26.579-1.796
        c12.128,0,20.772,2.315,26.58,6.965c5.548,4.382,9.292,11.615,9.292,20.127c0,8.51-2.837,15.745-7.999,20.646
        c-6.714,6.32-16.643,9.157-28.258,9.157c-2.585,0-4.902-0.128-6.714-0.379v31.096H99.053V284.379z M386.034,450.713H121.811
        c-10.954,0-19.874-8.92-19.874-19.889v-22.995h246.31c11.42,0,20.679-9.25,20.679-20.677V261.748
        c0-11.428-9.259-20.679-20.679-20.679h-246.31V51.315c0-10.938,8.921-19.858,19.874-19.858l181.89-0.19v67.233
        c0,19.638,15.934,35.587,35.587,35.587l65.862-0.189l0.741,296.925C405.891,441.793,396.987,450.713,386.034,450.713z
        M174.065,369.801v-85.422c7.225-1.15,16.642-1.796,26.58-1.796c16.516,0,27.226,2.963,35.618,9.282
        c9.031,6.714,14.704,17.416,14.704,32.781c0,16.643-6.06,28.133-14.453,35.224c-9.157,7.612-23.096,11.222-40.125,11.222
        C186.191,371.092,178.966,370.446,174.065,369.801z M314.892,319.226v15.996h-31.23v34.973h-19.74v-86.966h53.16v16.122h-33.42
        v19.875H314.892z"/>
    </g>
  </svg>
);

const Scan = ({ onDataScanned }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previews, setPreviews] = useState([]);
  const [previewModal, setPreviewModal] = useState({
    show: false,
    url: '',
    name: ''
  });

  // GEMINI API 設定
  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",  // 改用 gemini-pro-vision
    generationConfig: {
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    }
  });

  // 新增兩個不同的 prompt
  const specPrompt = `根據圖中取以下資訊：
    其中規格為品名規格中空格後的值，如"透浦式風機TFBD-8.5# 型五"，其值為型五，型式固定為"型X"
    產品名稱為型式
    風量NCMM 如果單位為NCMM直接使用其值，假如單位為ACMM或SCMM，乘以0.932即為NCMM單位
    型號 為機種的"-"前面的值，或者是5500SW3300這樣由四個數字＋SW的組合，SW捨去，取W前面的值，假如有兩個-，取第一個-前面的值
    葉輪直徑mm -> 為機種的"-"後面的值
    判斷該值是否是5500SW3612這樣由四個數字＋SW的組合，取SW後面的值的前兩位數而不是四位數，也就是範例的36，如不是，取機種的"-"後面的值
    假如是SW後的值，該值乘以2.54即為結果
    假如是SAF或SQA後的值，如SAF-A-40.25，取數字40.25為值，該值乘以2.54即為結果，或是取第二個-後的值
    假如型號為TF0X，該值乘以150即為結果
    假如型號為TFBC或TFBD，該值X，公式為 (X+5)/2100 = 結，比如TFBC-4# → 4為其值， (4+5)/2100=450mm
    假如型號為TFP，該值乘以150即為結果
    馬力HP找出馬力值
    靜壓mmAq 為靜壓的值
    驅動方式 只擷取"XX式"其他不留
    風機等級拿掉空格及"級"，結果只有四種 AA A AB BB
    防火花級只有A、B、C、D、無五種結果，根據擷取找出對應的值，如果是X(無)，該值為無
    操作溫度°C為溫度的值
    機殼材質 假如材質為單一種，該值為機殼材質的值，假如材質為多個材質如SUS304+SS400，取前面SUS304為其值
    架台材質 資料來自"材質"，假如該值為單一種如SS400，該值為架台材質的值SS400，假如材質為多個材質如SUS304+SS400，取後面SS400為其值
    請以JSON格式回傳結果。
    給我葉輪直徑計算過程`;

  const dimensionPrompt = `根據圖面的三視圖，判別出該機械的最大長、寬、高，並以下列JSON格式回傳：
    {
      "長度": "數值",
      "寬度": "數值",
      "高度": "數值"
    }
    單位為mm，數值不需要包含單位`;

  const processFiles = async (files) => {
    try {
      setIsLoading(true);
      setError(null);

      let specData = null;
      let dimensionData = null;

      // 處理每個文件
      for (const file of files) {
        const imageData = await readFileAsBase64(file);
        const imageParts = [
          {
            inlineData: {
              mimeType: file.type,
              data: imageData
            }
          }
        ];

        // 對每個圖片都嘗試兩種 prompt
        const specResult = await model.generateContent([...imageParts, { text: specPrompt }]);
        const dimensionResult = await model.generateContent([...imageParts, { text: dimensionPrompt }]);

        // 處理規格資訊
        try {
          const specText = specResult.response.text();
          const specJson = extractJSON(specText);
          if (specJson && Object.keys(specJson).length > 0) {
            specData = specJson;
          }
        } catch (err) {
          console.log('規格資訊解析失敗:', err);
        }

        // 處理尺寸資訊
        try {
          const dimensionText = dimensionResult.response.text();
          const dimensionJson = extractJSON(dimensionText);
          if (dimensionJson && dimensionJson.長度) {
            dimensionData = dimensionJson;
          }
        } catch (err) {
          console.log('尺寸資訊解析失敗:', err);
        }
      }

      // 合併資料
      if (!specData && !dimensionData) {
        throw new Error('無法從圖片中識別任何資訊');
      }

      // 將掃描資料映射到表單欄位
      const formattedData = {
        系列: specData?.型號 || '',
        型號: specData?.規格 || '',
        產品名稱: specData?.產品名稱 || '',
        風量NCMM: String(specData?.風量NCMM || ''),
        葉輪直徑mm: String(specData?.葉輪直徑mm || ''),
        驅動方式: specData?.驅動方式 || '',
        風機等級: specData?.風機等級 || '',
        防火花級: specData?.防火花級 || '',
        '操作溫度°C': String(specData?.['操作溫度°C'] || ''),
        機殼材質: specData?.機殼材質 || '',
        架台材質: specData?.架台材質 || '',
        '出口⽅向': 'A',
        '單雙吸': '單吸',
        '馬力HP': String(specData?.馬力HP || ''),
        '採購數量': '1',
        '靜壓mmAq': String(specData?.靜壓mmAq || ''),
        // 加入尺寸資訊
        長度: String(dimensionData?.長度 || ''),
        寬度: String(dimensionData?.寬度 || ''),
        高度: String(dimensionData?.高度 || '')
      };

      onDataScanned(formattedData);
      setIsLoading(false);
    } catch (err) {
      setError('處理文件時發生錯誤：' + err.message);
      setIsLoading(false);
    }
  };

  // 輔助函數：讀取文件為 base64
  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 輔助函數：從文本中提取 JSON
  const extractJSON = (text) => {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr.trim());
  };

  // 修改 pdfBlobToImageDataURL 函數
  const pdfBlobToImageDataURL = async (pdfBlob, scale = 1.5) => {
    try {
      const arrayBuffer = await pdfBlob.arrayBuffer();
      
      // 使用 getDocument
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      await page.render(renderContext).promise;
      
      return canvas.toDataURL();
    } catch (error) {
      console.error('PDF 轉換失敗:', error);
      return null;
    }
  };

  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func.apply(null, args);
      }, delay);
    };
  };

  // 修改 handleFileSelect 函數
  const handleFileSelect = async (e, type) => {
    const files = e.target.files;
    if (!files?.length) return;

    // 先清理同類型的舊預覽
    setPreviews(prev => {
      const oldPreviews = prev.filter(p => p.type === type);
      oldPreviews.forEach(preview => {
        if (!preview.isPdf) {
          URL.revokeObjectURL(preview.url);
        }
      });
      return prev.filter(p => p.type !== type);
    });

    // 創建新的預覽
    const newPreviews = await Promise.all(Array.from(files).map(async file => {
      const isPdf = file.type.toLowerCase().includes('pdf');
      let url;
      if (isPdf) {
        url = await pdfBlobToImageDataURL(file);
      } else {
        url = URL.createObjectURL(file);
      }
      return {
        file,
        url,
        isPdf,
        type,
        name: file.name
      };
    }));

    // 更新預覽狀態
    setPreviews(prev => [...prev, ...newPreviews]);

    // 確保 processFiles 只在這裡調用一次
    await processFiles(files);
  };

  const removePreview = (index, type) => {
    setPreviews(prev => {
      const newPreviews = [...prev];
      const previewToRemove = newPreviews.find((p, i) => p.type === type && i === index);
      if (previewToRemove && !previewToRemove.isPdf) {
        URL.revokeObjectURL(previewToRemove.url);
      }
      return newPreviews.filter((p, i) => !(p.type === type && i === index));
    });
  };

  // 在組件卸載時清理所有 URL
  useEffect(() => {
    return () => {
      previews.forEach(preview => {
        if (!preview.isPdf) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, []);

  // 添加開啟和關閉 Modal 的函數
  const openPreviewModal = (url, name) => {
    setPreviewModal({
      show: true,
      url,
      name
    });
  };

  const closePreviewModal = () => {
    setPreviewModal({
      show: false,
      url: '',
      name: ''
    });
  };

  // 在組件中添加鍵盤事件監聽
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewModal.show) {
        closePreviewModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewModal.show]);

  return (
    <div className="scan-container mb-3">
      <div className="row">
        {/* 左側 - 訂購規範書/製造通知單上傳區域 */}
        <div className="col-6">
          <div className="card">
            <div className="card-header">
              訂購規範書/製造通知單
            </div>
            <div className="card-body">
              <div className="input-group mb-3">
                <input
                  type="file"
                  className="form-control"
                  accept="image/jpeg,image/png,image/gif,application/pdf"
                  onChange={(e) => handleFileSelect(e, 'spec')}
                  disabled={isLoading}
                />
                <button
                  className="btn btn-outline-primary"
                  type="button"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      掃描中...
                    </>
                  ) : '上傳規格文件'}
                </button>
              </div>

              {/* 規格文件預覽區域 */}
              {previews.filter(p => p.type === 'spec').length > 0 && (
                <div className="preview-container">
                  <div className="d-flex gap-2 flex-wrap mb-2">
                    {previews.filter(p => p.type === 'spec').map((preview, index) => (
                      <div
                        key={index}
                        className="preview-item position-relative bg-white"
                        style={{
                          width: '150px',
                          height: '150px',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          cursor: 'pointer'
                        }}
                        onClick={() => preview.isPdf && openPreviewModal(preview.url, preview.name)}
                      >
                        {preview.isPdf ? (
                          <div className="d-flex flex-column align-items-center justify-content-center h-100">
                            {preview.useIcon ? (
                              // 顯示 PDF 圖示
                              <div style={{
                                width: '64px',
                                height: '64px',
                                marginBottom: '8px',
                                color: '#dc3545'
                              }}>
                                <PdfIcon />
                              </div>
                            ) : (
                              // 顯示 PDF 預覽圖
                              <img
                                src={preview.url}
                                alt="PDF 預覽"
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  objectFit: 'contain',
                                  padding: '8px'
                                }}
                                onError={(e) => {
                                  console.error('PDF 預覽載入失敗');
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            <small className="text-muted text-break px-2">
                              {preview.name}
                            </small>
                          </div>
                        ) : (
                          <div className="h-100 w-100 d-flex align-items-center justify-content-center bg-light">
                            <img
                              src={preview.url}
                              alt={`預覽 ${preview.name}`}
                              style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                padding: '8px',
                                backgroundColor: '#f8f9fa'
                              }}
                              onError={(e) => {
                                console.error('Image load error:', e);
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <button
                          type="button"
                          className="btn btn-light position-absolute top-0 end-0 m-2 d-flex align-items-center justify-content-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePreview(index, 'spec');
                          }}
                          style={{
                            borderRadius: '50%',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            width: '24px',
                            height: '24px',
                            padding: 0
                          }}
                        >
                          <span className="material-icons-outlined">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右側 - 設計圖上傳區域 */}
        <div className="col-6">
          <div className="card">
            <div className="card-header">
              設計圖
            </div>
            <div className="card-body">
              <div className="input-group mb-3">
                <input
                  type="file"
                  className="form-control"
                  accept="image/jpeg,image/png,image/gif,application/pdf"
                  onChange={(e) => handleFileSelect(e, 'design')}
                  disabled={isLoading}
                />
                <button
                  className="btn btn-outline-primary"
                  type="button"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      掃描中...
                    </>
                  ) : '上傳設計圖'}
                </button>
              </div>

              {/* 設計圖預覽區域 */}
              {previews.filter(p => p.type === 'design').length > 0 && (
                <div className="preview-container">
                  <div className="d-flex gap-2 flex-wrap mb-2">
                    {previews.filter(p => p.type === 'design').map((preview, index) => (
                      <div
                        key={index}
                        className="preview-item position-relative bg-white"
                        style={{
                          width: '150px',
                          height: '150px',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          cursor: 'pointer'
                        }}
                        onClick={() => preview.isPdf && openPreviewModal(preview.url, preview.name)}
                      >
                        {preview.isPdf ? (
                          <div className="d-flex flex-column align-items-center justify-content-center h-100">
                            <img
                              src={preview.url}
                              alt="PDF 文件"
                              style={{
                                width: '64px',
                                height: '64px',
                                marginBottom: '8px'
                              }}
                            />
                            <small className="text-muted text-break px-2">
                              {preview.name}
                            </small>
                          </div>
                        ) : (
                          <div className="h-100 w-100 d-flex align-items-center justify-content-center bg-light">
                            <img
                              src={preview.url}
                              alt={`預覽 ${preview.name}`}
                              style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                padding: '8px',
                                backgroundColor: '#f8f9fa'
                              }}
                              onError={(e) => {
                                console.error('Image load error:', e);
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <button
                          type="button"
                          className="btn-close position-absolute top-0 end-0 m-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePreview(index, 'design');
                          }}
                          style={{
                            background: 'white',
                            padding: '4px',
                            borderRadius: '50%',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                        X</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mt-2">
          {error}
        </div>
      )}

      {/* 添加預覽 Modal */}
      {previewModal.show && (
        <div 
          className="modal fade show d-block" 
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1050
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{previewModal.name}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={closePreviewModal}
                />
              </div>
              <div className="modal-body text-center">
                <img
                  src={previewModal.url}
                  alt={previewModal.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '80vh',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 添加 Modal 相關的 CSS
const modalStyles = {
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1050
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    maxWidth: '90%',
    maxHeight: '90vh',
    overflow: 'auto'
  }
};

export default Scan; 