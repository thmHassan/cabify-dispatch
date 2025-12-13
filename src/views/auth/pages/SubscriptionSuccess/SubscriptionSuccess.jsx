import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../../../../components/ui/Button/Button";

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const handleGoToCompanies = () => {
    navigate("/companies");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-6">
          Your subscription has been activated successfully. Thank you for your payment.
        </p>

        {/* Session ID Display */}
        {sessionId && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Session ID:</p>
            <p className="text-xs text-gray-700 font-mono break-all">
              {sessionId}
            </p>
          </div>
        )}

        {/* Action Button */}
        <Button
          btnSize="lg"
          type="filled"
          className="w-full py-3 px-6 text-lg font-semibold"
          onClick={handleGoToCompanies}
        >
          Go to Companies
        </Button>

        {/* Additional Info */}
        <p className="text-xs text-gray-500 mt-4">
          You can now access all company management features.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
