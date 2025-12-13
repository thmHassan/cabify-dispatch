import React from "react";
import CardContainer from "../../../CardContainer";
import CommonTableRowFields from "../CommonTableRowFields/CommonTableRowFields";
import CardSubtitle from "../../../../ui/CardSubtitle";
import ChildText from "../../../../ui/ChildText.jsx/ChildText";
import Tag from "../../../../ui/Tag";
import Button from "../../../../ui/Button/Button";
import carImage from "../../../../../assets/Images/807f3bb8e5ba80773dc9ff8ac31118d91262991a.png";

const VehicleTypeFields = ({ actionOptions, data }) => {
  const {
    vehicle_type_name,
    vehicle_type_service,
    minimum_price,
    minimum_distance,
  } = data;
  return (
    <CommonTableRowFields
      itemData={data}
      data={{
        actionOptions,
      }}
    >
      <td className="w-full py-[22px] px-[30px]">
        <div className="flex gap-2.5">
          <div className="h-[60px] w-[110px]">
            <CardContainer
              type={1}
              border={1}
              className="h-full !rounded-lg overflow-hidden"
            >
              <img
                src={carImage}
                alt=""
                className="w-full h-full object-contain"
              />
            </CardContainer>
          </div>
          <div className="flex flex-col gap-2">
            <CardSubtitle type={1} subtitle={vehicle_type_name} />
            <ChildText
              size="md"
              className="!text-[#6C6C6C]"
              text={vehicle_type_service}
            />
          </div>
        </div>
      </td>
      <td className="px-[30px] py-[22px] text-right align-middle" align="right">
        <div className="flex gap-[30px] items-center justify-end w-full">
          <Tag
            size="md"
            variant="mediumGray"
            className="flex gap-2.5 !px-5 !py-2.5 whitespace-nowrap"
          >
            <span>{minimum_price}</span>
          </Tag>
          <Tag
            size="md"
            variant="mediumGray"
            className="flex gap-2.5 !px-5 !py-2.5 whitespace-nowrap"
          >
            <span>{minimum_distance}</span>
          </Tag>
          <Button
            type="filled"
            btnSize="md"
            className="!rounded-[35px] !py-2.5 !px-5 whitespace-nowrap"
          >
            <span>View</span>
          </Button>
        </div>
      </td>
    </CommonTableRowFields>
  );
};

export default VehicleTypeFields;
