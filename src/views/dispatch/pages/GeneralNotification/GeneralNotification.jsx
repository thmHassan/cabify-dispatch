import { useEffect, useState } from "react";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import PageSubTitle from "../../../../components/ui/PageSubTitle/PageSubTitle";
import CardContainer from "../../../../components/shared/CardContainer/CardContainer";
import { ErrorMessage, Field, Form, Formik } from "formik";
import FormLabel from "../../../../components/ui/FormLabel/FormLabel";
import FormSelection from "../../../../components/ui/FormSelection/FormSelection";
import Button from "../../../../components/ui/Button/Button";
import * as Yup from "yup";
import { apiSendNotifiction } from "../../../../services/GeneralNotificationService";
import { apiGetAllVehicleType } from "../../../../services/VehicleTypeServices";

const userOptions = [
  { value: "all_drivers", label: "All Drivers" },
  { value: "all_users", label: "All Users" },
  { value: "pending_drivers", label: "Pending Drivers" },
  { value: "approved_drivers", label: "Approved Drivers" },
  { value: "rejected_drivers", label: "Rejected Drivers" },
];

const validationSchema = Yup.object({
  title: Yup.string().required("Title is required"),
  body: Yup.string().required("Body is required"),
  type: Yup.mixed().required("User type is required"),
  vehicleType: Yup.mixed().nullable(),
});

const GeneralNotification = () => {
  const [vehicleList, setVehicleList] = useState([]);
  const [loadingVehicleType, setLoadingVehicleType] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchVehicle = async () => {
      setLoadingVehicleType(true);
      try {
        const response = await apiGetAllVehicleType();
        if (response?.data?.success === 1) {
          const options = (response?.data?.list || []).map((vehicle) => ({
            label: vehicle.vehicle_type_name,
            value: vehicle.id.toString(),
          }));
          setVehicleList(options);
        }
      } catch (error) {
        console.error("Error fetching vehicle types:", error);
      } finally {
        setLoadingVehicleType(false);
      }
    };

    fetchVehicle();
  }, []);

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-6">
        <PageTitle title="General Notification" />
        <PageSubTitle title="Need content here" />
      </div>

      <CardContainer className="!p-3 sm:!p-4 lg:!px-5 lg:!pt-[30px] lg:!pb-5 2xl:!p-10">
        <Formik
          initialValues={{
            title: "",
            body: "",
            type: "",
            vehicleType: "",
          }}
          validationSchema={validationSchema}
          onSubmit={async (values, { resetForm }) => {
            try {
              setSending(true);

              console.log("FORM SUBMITTED:", values);

              const formData = new FormData();
              formData.append(
                "user_type",
                values.type?.value || values.type
              );
              formData.append("title", values.title);
              formData.append("body", values.body);

              // vehicle_id OPTIONAL
              if (values.vehicleType) {
                formData.append(
                  "vehicle_id",
                  values.vehicleType?.value || values.vehicleType
                );
              }

              const response = await apiSendNotifiction(formData);

              if (response?.data?.success === 1) {
                resetForm();
              }
            } catch (error) {
              console.error("Notification send failed:", error);
            } finally {
              setSending(false);
            }
          }}
        >
          {({ values, setFieldValue, handleSubmit, resetForm }) => (
            <Form>
              <div className="max-w-[624px] flex flex-col gap-5">

                <div>
                  <FormLabel>Title</FormLabel>
                  <div className="sm:h-16 h-14">
                    <Field
                      name="title"
                      type="text"
                      placeholder="Enter Title"
                      className="sm:px-5 px-4 sm:py-[21px] py-4 border border-[#8D8D8D] rounded-lg w-full h-full font-semibold"
                    />
                  </div>
                  <ErrorMessage name="title" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                <div>
                  <FormLabel>Body</FormLabel>
                  <div className="h-[130px]">
                    <Field
                      as="textarea"
                      name="body"
                      rows={5}
                      placeholder="Write here..."
                      className="h-full sm:px-5 px-4 sm:py-[21px] py-4 border border-[#8D8D8D] rounded-lg w-full font-semibold"
                    />
                  </div>
                  <ErrorMessage name="body" component="div" className="text-red-500 text-sm mt-1" />
                </div>

                <div>
                  <FormLabel>User Type</FormLabel>
                  <div className="sm:h-16 h-14">
                    <FormSelection
                      name="type"
                      value={values.type}
                      onChange={(val) => setFieldValue("type", val)}
                      placeholder="Select Type"
                      options={userOptions}
                    />
                  </div>
                  <ErrorMessage name="type" component="div" className="text-red-500 text-sm mt-1" />
                </div>

                <div>
                  <FormLabel>Vehicle Type </FormLabel>
                  <div className="sm:h-16 h-14">
                    <FormSelection
                      name="vehicleType"
                      value={values.vehicleType}
                      onChange={(val) => setFieldValue("vehicleType", val)}
                      placeholder={loadingVehicleType ? "Loading..." : "Select Vehicle Type"}
                      options={vehicleList}
                      isDisabled={loadingVehicleType}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <Button
                    btnType="submit"
                    btnSize="md"
                    type="filled"
                    onClick={handleSubmit}
                    disabled={sending}
                    className="sm:h-14 h-12 px-10 rounded-lg font-semibold"
                  >
                    {sending ? "Sending..." : "Send Notification"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => resetForm()}
                    className="border border-[#1F41BB] sm:h-14 h-12 px-10 rounded-lg font-semibold text-[#1F41BB]"
                  >
                    Clear
                  </Button>
                </div>

              </div>
            </Form>
          )}
        </Formik>
      </CardContainer>
    </div>
  );
};

export default GeneralNotification;
