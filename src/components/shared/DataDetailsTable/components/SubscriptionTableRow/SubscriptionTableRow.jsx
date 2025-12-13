import CardSubtitle from "../../../../ui/CardSubtitle";
import Tag from "../../../../ui/Tag";
import ChildText from "../../../../ui/ChildText.jsx/ChildText";
import CommonTableRowFields from "../CommonTableRowFields/CommonTableRowFields";
import WalletIcon from "../../../../svg/WalletIcon";
import DriverVehicleIcon from "../../../../svg/DriverVehicleIcon";
import _ from "lodash";

const ICON_CONFIG = {
  subscription: {
    component: WalletIcon,
    width: 31.82,
    height: 31.82,
    fill: "#1F41BB",
  },
  company: {
    component: DriverVehicleIcon,
    width: 32,
    height: 21,
    fill: "#1F41BB",
  },
};

const CompanyTableRow = (props) => {
  const { actionOptions, data, type } = props;
  const { name, status, location, drivers, contact, revenue } = data;
  return (
    <CommonTableRowFields
      itemData={data}
      data={{
        name,
        status,
        actionOptions,
        icon: ICON_CONFIG[type],
      }}
    >
      <td className="min-w-[631px] w-full">
        <div className="min-h-[120px] py-[30px]">
          <div className="flex gap-[30px] items-center min-h-max">
            <Tag size="md" variant="mediumGray">
              <span>{location}</span>
            </Tag>
            <Tag size="md" variant="mediumGray">
              <span>{drivers}</span>
            </Tag>
            <Tag size="md" variant="mediumGray">
              <span>{contact}</span>
            </Tag>
          </div>
        </div>
      </td>

      <td className="py-[30px] flex flex-col justify-center min-w-[199px]">
        <CardSubtitle type={1} subtitle={revenue} />
        <ChildText text="monthly revenue" />
      </td>
    </CommonTableRowFields>
  );
};

const SubscriptionTableRow = (props) => {
  const { actionOptions, data, type = "subscription" } = props;
  console.log(data, "data======", type);
  const { plan_name, amount, billing_cycle, features } = data;
  if (type === "company") {
    return <CompanyTableRow {...props} />;
  } else {
    return (
      <CommonTableRowFields
        itemData={data}
        data={{
          name: plan_name,
          status: ["Active", "Premium"],
          actionOptions,
          icon: ICON_CONFIG[type],
        }}
      >
        <td className="min-w-[631px] w-full">
          <div className="min-h-[120px] py-[30px]">
            <div className="flex gap-[30px] items-center min-h-max">
              {_.split(features, ",")?.map((feature, index) => (
                <Tag key={index} size="md" variant="mediumGray">
                  <span>{feature}</span>
                </Tag>
              ))}
            </div>
          </div>
        </td>

        <td className="py-[30px] flex flex-col justify-center min-w-[199px]">
          <CardSubtitle type={1} subtitle={`$${amount}`} />
          <ChildText text={`${billing_cycle} revenue`} />
        </td>
      </CommonTableRowFields>
    );
  }
};

export default SubscriptionTableRow;
