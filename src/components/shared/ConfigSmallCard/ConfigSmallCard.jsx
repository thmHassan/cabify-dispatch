import React from "react";
import CardContainer from "../CardContainer";
import CardSubtitle from "../../ui/CardSubtitle";

const ConfigSmallCard = ({ children, title }) => {
  return (
    <div className="w-[calc((100%-40px)/3)]">
      <CardContainer type={1} className="px-4 py-6 h-[141px]">
        <div className="flex flex-col gap-[15px] items-center justify-center">
          <CardSubtitle
            variant={1}
            className="!text-[#000000]"
            subtitle={title}
          />
          <div className="flex">{children}</div>
        </div>
      </CardContainer>
    </div>
  );
};

export default ConfigSmallCard;
