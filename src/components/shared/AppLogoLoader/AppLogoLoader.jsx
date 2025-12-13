import React from "react";
import AppLogoIcon from "../../svg/AppLogoIcon";

const AppLogoLoader = () => {
  return (
    <div className="flex items-center justify-center min-h-[100px] sm:min-h-[150px] lg:min-h-[200px] w-full py-4 sm:py-8 lg:py-12">
      <div className="flex items-center justify-center w-full max-w-[120px] sm:max-w-[200px]">
        <div
          className="w-full"
          style={{
            animation: "logoBlink 1.5s ease-in-out infinite",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="w-[100px] h-[100px]">
            <AppLogoIcon height={100} width={100} />
          </div>
        </div>
        <style jsx>{`
          @keyframes logoBlink {
            0% {
              transform: scale(0.8);
              opacity: 0.3;
            }
            50% {
              transform: scale(1.1);
              opacity: 1;
            }
            100% {
              transform: scale(0.8);
              opacity: 0.3;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default AppLogoLoader;
