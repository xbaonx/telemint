import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface MintStatusCheckerProps {
  requestId: string | null;
}

interface MintRequest {
  id: string;
  txHash: string;
  userAddress: string;
  metadataUri: string;
  status: 'pending' | 'completed' | 'failed';
  mintTxHash?: string;
  error?: string;
  predictedNftItemAddress?: string;
  nftItemAddress?: string;
  mintedAt?: string;
}

export function MintStatusChecker({ requestId }: MintStatusCheckerProps) {
  const [status, setStatus] = useState<'checking' | 'completed' | 'failed'>('checking');
  const [mintRequest, setMintRequest] = useState<MintRequest | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) return;
    
    const checkStatus = async () => {
      try {
        // Kiểm tra trạng thái mint, dùng API endpoint trong cùng domain
        const response = await fetch(`/api/mint-status/${requestId}`);
        
        if (!response.ok) {
          throw new Error('Không thể kết nối đến API');
        }
        
        const data = await response.json();
        console.log('📊 Mint status check:', data);
        
        if (data.request) {
          setMintRequest(data.request);
          
          if (data.request.status === 'completed') {
            setStatus('completed');
            // Dừng kiểm tra nếu đã hoàn thành
            return true;
          } else if (data.request.status === 'failed') {
            setStatus('failed');
            setErrorMessage(data.request.error || 'Lỗi không xác định');
            // Dừng kiểm tra nếu đã thất bại
            return true;
          }
        }
        
        // Tiếp tục kiểm tra nếu chưa hoàn thành
        return false;
      } catch (error) {
        console.error('Error checking mint status:', error);
        return false;
      }
    };
    
    // Kiểm tra ngay lần đầu
    checkStatus();
    
    // Sau đó kiểm tra mỗi 5 giây
    const interval = setInterval(async () => {
      const isDone = await checkStatus();
      if (isDone) {
        clearInterval(interval);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [requestId]);
  
  if (!requestId) {
    return null;
  }
  
  if (status === 'checking') {
    return (
      <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2 text-blue-700">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Đang mint NFT...</span>
        </div>
        <p className="text-xs text-blue-600 mt-2">
          Đang xử lý yêu cầu mint. Xin vui lòng đợi trong giây lát.
        </p>
        {mintRequest?.predictedNftItemAddress && (
          <div className="mt-3 text-left w-full">
            <p className="text-xs text-blue-700">Địa chỉ NFT dự kiến:</p>
            <a
              className="text-xs font-mono text-blue-700 underline break-all"
              href={`https://tonviewer.com/${mintRequest.predictedNftItemAddress}`}
              target="_blank"
              rel="noreferrer"
            >
              {mintRequest.predictedNftItemAddress}
            </a>
          </div>
        )}
      </div>
    );
  }
  
  if (status === 'completed') {
    return (
      <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="w-5 h-5" />
          <span>NFT đã mint thành công!</span>
        </div>
        {mintRequest?.nftItemAddress && (
          <div className="mt-2 w-full">
            <p className="text-xs text-green-700">Địa chỉ NFT:</p>
            <a
              className="text-xs font-mono text-green-700 underline break-all"
              href={`https://tonviewer.com/${mintRequest.nftItemAddress}`}
              target="_blank"
              rel="noreferrer"
            >
              {mintRequest.nftItemAddress}
            </a>
          </div>
        )}
        {!mintRequest?.nftItemAddress && mintRequest?.predictedNftItemAddress && (
          <div className="mt-2 w-full">
            <p className="text-xs text-green-700">Địa chỉ NFT (dự kiến):</p>
            <a
              className="text-xs font-mono text-green-700 underline break-all"
              href={`https://tonviewer.com/${mintRequest.predictedNftItemAddress}`}
              target="_blank"
              rel="noreferrer"
            >
              {mintRequest.predictedNftItemAddress}
            </a>
          </div>
        )}
        <p className="text-xs text-green-600 mt-2">
          NFT sẽ xuất hiện trong ví của bạn trong vài phút.
        </p>
      </div>
    );
  }
  
  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center p-4 bg-red-50 rounded-lg">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>Mint NFT thất bại</span>
        </div>
        <p className="text-xs text-red-600 mt-2">
          {errorMessage || 'Đã xảy ra lỗi khi mint NFT. Vui lòng thử lại sau.'}
        </p>
      </div>
    );
  }
  
  return null;
}
