import React from "react";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import PageSubTitle from "../../../../components/ui/PageSubTitle/PageSubTitle";
import CardContainer from "../../../../components/shared/CardContainer/CardContainer";
import { ErrorMessage, Field, Form, Formik } from "formik";
import FormLabel from "../../../../components/ui/FormLabel/FormLabel";
import FormSelection from "../../../../components/ui/FormSelection/FormSelection";

const typeOptions = [
  { value: "coming_soon", label: "Coming Soon" },
  { value: "premium", label: "Premium" },
  { value: "normal", label: "Normal" },
  { value: "bike", label: "Bike" },
  { value: "rickshaw", label: "Rickshaw" },
  { value: "economy", label: "Economy" },
  { value: "comfort", label: "Comfort" },
];
const vehicleTypeOptions = [
  { value: "all_drivers", label: "All Drivers" },
  { value: "all_users", label: "All Users" },
  { value: "pending_drivers", label: "Pending Drivers" },
  { value: "approved_drivers", label: "Approved Drivers" },
  { value: "rejected_drivers", label: "Rejected Drivers" },
];

const GeneralNotification = () => {
  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-6">
        <div className="flex justify-between">
          <PageTitle title="General Notification" />
        </div>
        <div>
          <PageSubTitle title="Need content here" />
        </div>
      </div>
      <div className="flex flex-col sm:gap-5 gap-4">
        <CardContainer className="!p-3 sm:!p-4 lg:!px-5 lg:!pt-[30px] lg:!pb-5 2xl:!p-10">
          <Formik initialValues={{}}>
            {({ values, setFieldValue }) => (
              <Form>
                <div className="max-w-[624px] flex flex-col gap-5">
                  <div className="w-full">
                    <FormLabel htmlFor="title">Title</FormLabel>
                    <div className="sm:h-16 h-14">
                      <Field
                        type="text"
                        name="title"
                        className="sm:px-5 px-4 sm:py-[21px] py-4 border border-[#8D8D8D] rounded-lg w-full h-full shadow-[-4px_4px_6px_0px_#0000001F] placeholder:text-[#6C6C6C] sm:text-base text-sm leading-[22px] font-semibold"
                        placeholder="Enter Title"
                      />
                    </div>
                    <ErrorMessage
                      name="title"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                  <div className="w-full">
                    <FormLabel htmlFor="body">Body</FormLabel>
                    <div className="h-[130px]">
                      <Field
                        as="textarea"
                        name="body"
                        rows={5}
                        className="h-full sm:px-5 px-4 sm:py-[21px] py-4 border border-[#8D8D8D] rounded-lg w-full shadow-[-4px_4px_6px_0px_#0000001F] placeholder:text-[#6C6C6C] sm:text-base text-sm leading-[22px] font-semibold"
                        placeholder="Write here..."
                      />
                    </div>
                    <ErrorMessage
                      name="body"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                  <div className="w-full">
                    <FormLabel htmlFor="type">Type</FormLabel>
                    <div className="sm:h-16 h-14">
                      <FormSelection
                        label="Select Type"
                        name="type"
                        value={values.type}
                        onChange={(val) => setFieldValue("type", val)}
                        placeholder="Select Type"
                        options={typeOptions}
                      />
                    </div>
                    <ErrorMessage
                      name="type"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                  <div className="w-full">
                    <FormLabel htmlFor="vehicleType">Vehicle Type</FormLabel>
                    <div className="sm:h-16 h-14">
                      <FormSelection
                        label="Select Vehicle Type"
                        name="vehicleType"
                        value={values.vehicleType}
                        onChange={(val) => setFieldValue("vehicleType", val)}
                        placeholder="Select Vehicle Type"
                        options={vehicleTypeOptions}
                      />
                    </div>
                    <ErrorMessage
                      name="vehicleType"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </CardContainer>
      </div>
    </div>
  );
};

export default GeneralNotification;
