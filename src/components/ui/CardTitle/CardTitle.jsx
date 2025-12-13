import React from "react";

const CardTitle = ({ title }) => {
  return (
    <h4 className="text-[#252525] font-semibold 2xl:text-[30px] sm:text-2xl text-xl 2xl:leading-[45px] sm:leading-6 leading-5 mb-[5px]">
      {title}
    </h4>
  );
};

export default CardTitle;
