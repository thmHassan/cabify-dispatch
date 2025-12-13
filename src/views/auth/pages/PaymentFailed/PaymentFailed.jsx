import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../../../../components/ui/Button/Button";

const PaymentFailed = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const errorMessage = searchParams.get("error") || "Payment processing failed";

  const handleRetryPayment = () => {
    navigate("/companies");
  };

  const handleGoToCompanies = () => {
    navigate("/companies");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Error Icon */}
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Failed
        </h1>
        <p className="text-gray-600 mb-4">
          We're sorry, but your payment could not be processed at this time.
        </p>
        
        {/* Error Details */}
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-700 font-medium mb-2">Error Details:</p>
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>

        {/* Session ID Display */}
        {sessionId && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Session ID:</p>
            <p className="text-xs text-gray-700 font-mono break-all">
              {sessionId}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            btnSize="lg"
            type="filled"
            className="w-full py-3 px-6 text-lg font-semibold"
            onClick={handleRetryPayment}
          >
            Retry Payment
          </Button>
          
          <Button
            btnSize="lg"
            type="filledGray"
            className="w-full py-3 px-6 text-lg font-semibold"
            onClick={handleGoToCompanies}
          >
            Go to Companies
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Need help?</strong> If you continue to experience issues, 
            please contact our support team or try using a different payment method.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
