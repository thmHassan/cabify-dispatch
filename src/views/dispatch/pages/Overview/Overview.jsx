import React, { useState } from "react";
import CompaniesIcon from "../../../../components/svg/CompaniesIcon";
import SystemUptimeIcon from "../../../../components/svg/SystemUptimeIcon";
import SubscriptionIcon from "../../../../components/svg/SubscriptionIcon";
import MonthlyRevenueIcon from "../../../../components/svg/MonthlyRevenueIcon";
import SnapshotCard from "../../../../components/shared/SnapshotCard/SnapshotCard";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import PageSubTitle from "../../../../components/ui/PageSubTitle/PageSubTitle";
import Button from "../../../../components/ui/Button/Button";
import PlusIcon from "../../../../components/svg/PlusIcon";
import CardContainer from "../../../../components/shared/CardContainer/CardContainer";
import CardTitle from "../../../../components/ui/CardTitle/CardTitle";
import CardSubtitle from "../../../../components/ui/CardSubtitle/CardSubtitle";
import TotalUserIcon from "../../../../components/svg/TotalUserIcon";
import TotalBookingIcon from "../../../../components/svg/TotalBookingIcon";
import ScheduleIcon from "../../../../components/svg/ScheduleIcon";
import CompletedJobsIcon from "../../../../components/svg/CompletedJobsIcon";
import TotalCancellationsIcon from "../../../../components/svg/TotalCancellationsIcon";
import CancelledAmountIcon from "../../../../components/svg/CancelledAmountIcon";
import TotalRevenueIcon from "../../../../components/svg/TotalRevenueIcon";
import TotalTipIcon from "../../../../components/svg/TotalTipIcon";
import CashPaymentsIcon from "../../../../components/svg/CashPaymentsIcon";
import IosUsersIcon from "../../../../components/svg/IosUsersIcon";
import AndroidUserIcon from "../../../../components/svg/AndroidUserIcon";
import AdminUsersIcon from "../../../../components/svg/AdminUsersIcon";
import ChildText from "../../../../components/ui/ChildText.jsx/ChildText";
import Tag from "../../../../components/ui/Tag/Tag";
import { lockBodyScroll } from "../../../../utils/functions/common.function";
import Modal from "../../../../components/shared/Modal/Modal";
import AddBookingModel from "./components/AddBookingModel";

const DASHBOARD_CARDS = [
  {
    title: "Active Rides",
    value: 100,
    change: "+3 from last hour",
    icon: {
      component: CompaniesIcon,
    },
    backgroundColor: "#eeedff",
    color: "#534CB4",
  },
  {
    title: "Cancelled Rides",
    value: 24,
    change: "+3 from last hour",
    icon: {
      component: SystemUptimeIcon,
    },
    backgroundColor: "#e9f2ff",
    color: "#3C71B7",
  },
  {
    title: "Jobs Waiting",
    value: 30,
    change: "+3 from last hour",
    icon: {
      component: SubscriptionIcon,
    },
    backgroundColor: "#e5f9f0",
    color: "#3E9972",
  },
  {
    title: "Drivers On Break",
    value: 12,
    change: "+3 from last hour",
    icon: {
      component: MonthlyRevenueIcon,
    },
    backgroundColor: "#fdf3e7",
    color: "#C29569",
  },
];

const ICONS = {
  user: TotalUserIcon,
  bookings: TotalBookingIcon,
  calendar: ScheduleIcon,
  completed: CompletedJobsIcon,
  cancel: TotalCancellationsIcon,
  "car-cancelled": CancelledAmountIcon,
  revenue: TotalRevenueIcon,
  tip: TotalTipIcon,
  cash: CashPaymentsIcon,
  ios: IosUsersIcon,
  android: AndroidUserIcon,
  admin: AdminUsersIcon,
};

const DASHBOARDS_CARDS = {
  userStats: [
    {
      title: "Total User",
      value: 100,
      icon: "user",
    },
    {
      title: "Total Drivers",
      value: 100,
      icon: "user",
    },
    {
      title: "Total Bookings",
      value: 100,
      icon: "bookings",
    },
    {
      title: "Scheduled Bookings",
      value: 100,
      icon: "calendar",
    },
    {
      title: "Completed Jobs",
      value: 100,
      icon: "completed",
    },
    {
      title: "Total Cancelled",
      value: 100,
      icon: "cancel",
    },
    {
      title: "Cancelled Amount",
      value: 100,
      icon: "car-cancelled",
    },
  ],
  bookingStats: [
    {
      title: "Total Revenue",
      value: 100,
      icon: "revenue",
    },
    {
      title: "Total Tip",
      value: 100,
      icon: "tip",
    },
    {
      title: "Total Tip- Driver",
      value: 100,
      icon: "tip",
    },
    {
      title: "Cash Payments",
      value: 100,
      icon: "cash",
    },
  ],
  revenueStats: [
    {
      title: "iOS Users",
      value: 100,
      icon: "ios",
    },
    {
      title: "Android users",
      value: 100,
      icon: "android",
    },
    {
      title: "Admin User",
      value: 100,
      icon: "admin",
    },
  ],
};

const ALERTS = [
  {
    title: "Driver License Expiring",
    description: "3 drivers have licenses expiring within 30 days",
    priority: {
      label: "High",
      theme: "red",
    },
    timeAgo: "1 hour ago",
  },
  {
    title: "Driver License Expiring",
    description: "3 drivers have licenses expiring within 30 days",
    priority: {
      label: "Medium",
      theme: "orange",
    },
    timeAgo: "1 hour ago",
  },
  {
    title: "Driver License Expiring",
    description: "3 drivers have licenses expiring within 30 days",
    priority: {
      label: "Low",
      theme: "green",
    },
    timeAgo: "1 hour ago",
  },
  {
    title: "Driver License Expiring",
    description: "3 drivers have licenses expiring within 30 days",
    priority: {
      label: "Low",
      theme: "green",
    },
    timeAgo: "1 hour ago",
  },
];

const Overview = () => {
  const [isBookingModelOpen, setIsBookingModelOpen] = useState({
    type: "new",
    isOpen: false,
  })
  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex justify-between sm:flex-row flex-col items-start sm:items-center gap-3 sm:gap-0 2xl:mb-6 1.5xl:mb-10 mb-0">
        <div className="sm:mb-[30px] mb-1 sm:w-[calc(100%-240px)] w-full flex gap-5 items-center">
          <div className="w-20 h-20 rounded-full bg-[#000000]"></div>
          <div className="flex flex-col gap-2.5 w-[calc(100%-100px)]">
            <PageTitle title="Autocare Services" />
            <PageSubTitle title="Welcome back! (Admin Name), Here's what's happening with your transportation business today." />
          </div>
        </div>
        <div className="sm:w-auto xs:w-auto w-full sm:mb-[50px] mb-8">
          <Button
            type="filled"
            btnSize="2xl"
            onClick={() => {
              lockBodyScroll();
              setIsBookingModelOpen({ isOpen: true, type: "new" });
            }}
            className="w-full sm:w-auto -mb-2 sm:-mb-3 lg:-mb-3 !py-3.5 sm:!py-3 lg:!py-3"
          >
            <div className="flex gap-2 sm:gap-[15px] items-center justify-center whitespace-nowrap">
              <span className="hidden sm:inline-block">
                <PlusIcon />
              </span>
              <span className="sm:hidden">
                <PlusIcon height={16} width={16} />
              </span>
              <span>Add New Booking</span>
            </div>
          </Button>
        </div>
      </div>
      <div className="flex flex-col sm:gap-5 gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 1.5xl:grid-cols-4 gap-4 sm:gap-5">
          {DASHBOARD_CARDS.map((card, index) => (
            <SnapshotCard
              key={index}
              data={{
                ...card,
                // value: dashboardDetails[card.value] || 0
              }}
            />
          ))}
        </div>
        <CardContainer className="p-3 sm:p-4 lg:px-5 lg:pt-[30px] lg:pb-5 bg-[#F5F5F5]">
          <div className="flex flex-col gap-2.5 mb-[34px]">
            <CardTitle title="Overview" />
            <CardSubtitle subtitle="Need content from client" />
          </div>
          <div className="flex flex-col gap-[25px]">
            {Object.keys(DASHBOARDS_CARDS).map((key, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-2 1.5xl:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-[15px] pb-[25px] last:pb-0 border-b-[0.7px] border-[#6C6C6C] last:border-b-0"
              >
                {DASHBOARDS_CARDS[key].map((card, iIndex) => {
                  const Icon = ICONS[card?.icon];
                  return (
                    <CardContainer
                      key={iIndex}
                      type={1}
                      className="h-[120px] p-5 !rounded-[15px] flex gap-[15px] items-start"
                    >
                      <div className="w-[50px]">
                        <div className="w-full h-[50px] border-2 border-[#3E99724D] rounded-[20px] flex items-center justify-center">
                          <Icon />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2.5 justify-start h-full">
                        <PageTitle
                          className="!leading-[44px] -mt-0.5"
                          title={card?.value}
                        />
                        <PageSubTitle
                          className="leading-[22px]"
                          title={card?.title}
                        />
                      </div>
                    </CardContainer>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContainer>
        <CardContainer className="p-3 sm:p-4 lg:p-5 bg-[#F5F5F5]">
          <div className="flex justify-between items-center mb-[34px]">
            <CardSubtitle type={1} subtitle="System Alerts" />
            <Button className="border border-[#1F41BB] rounded-lg pt-[11px] pb-2.5 px-[25px] text-[#1F41BB] font-semibold">
              <span>Mark as Read</span>
            </Button>
          </div>
          <div className="flex flex-col gap-2.5">
            {ALERTS.map(
              (
                { title, description, priority: { label, theme }, timeAgo },
                index
              ) => (
                <CardContainer key={index} type={1} className="!p-[25px]">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-2 min-w-[500px] max-w-[500px]">
                      <CardSubtitle type={1} variant={1} subtitle={title} />
                      <ChildText size="md" text={description} />
                    </div>
                    <div className="flex pl-5 min-w-[150px]">
                      <Tag
                        variant={theme}
                        className="!text-sm !pt-[7px] !pb-1.5 !px-[19px]"
                      >
                        <span>{label}</span>
                      </Tag>
                    </div>
                    <div className="text-sm text-[#6C6C6C]">
                      <span>{timeAgo}</span>
                    </div>
                  </div>
                </CardContainer>
              )
            )}
          </div>
        </CardContainer>
      </div>
      <Modal
        isOpen={isBookingModelOpen.isOpen}
        className="p-4 sm:p-6 lg:p-10"
      >
        <AddBookingModel
          // initialValue={isBookingModelOpen.type === "edit" ? isBookingModelOpen.accountData : {}}
          setIsOpen={setIsBookingModelOpen}
          // onSubCompanyCreated={handleOnSubCompanyCreated}
        />
      </Modal>
    </div>
  );
};

export default Overview;
