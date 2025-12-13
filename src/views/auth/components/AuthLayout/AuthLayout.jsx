import React from "react";

const AuthLayout = ({ children, title }) => {
  return (
    <div className="min-h-screen py-4 sm:py-6 md:py-7 lg:py-8 xl:py-9 2xl:py-10 px-4 sm:px-6 md:px-7 lg:px-8 xl:px-9 2xl:px-10 flex justify-center items-center">
      <div className="xl:max-w-[680px] sm:max-w-[560px] xs:max-w-[400px] w-full border-2 border-[#1F41BB4D] rounded-xl sm:rounded-2xl md:rounded-[18px] lg:rounded-[20px] px-4 sm:px-6 md:px-7 lg:px-8 xl:px-9 2xl:px-10 pb-8 sm:pb-10 xl:pb-16 2xl:pb-[75px] pt-6 sm:pt-8 xl:pt-16 2xl:pt-20 shadow-[-4px_8px_20px_0px_#0000000D]">
        <div>
          <h2 className="font-semibold text-2xl sm:text-[28px] md:text-3xl lg:text-[36px] xl:text-4xl 2xl:text-[40px] leading-7 sm:leading-8 md:leading-9 lg:leading-[46px] xl:leading-[50px] 2xl:leading-[55px] pb-6 sm:pb-7 md:pb-8 lg:pb-10 xl:pb-12 2xl:pb-[59px] text-center">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
