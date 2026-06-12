import { useCallback, useEffect, useState } from "react";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import CardContainer from "../../../../components/shared/CardContainer/CardContainer";
import { ErrorMessage, Field, Form, Formik } from "formik";
import FormLabel from "../../../../components/ui/FormLabel/FormLabel";
import FormSelection from "../../../../components/ui/FormSelection/FormSelection";
import Button from "../../../../components/ui/Button/Button";
import { apiSendNotifiction } from "../../../../services/GeneralNotificationService";
import { apiGetAllVehicleType } from "../../../../services/VehicleTypeServices";
import { apiGetUser } from "../../../../services/UserService";
import { apiGetDriverManagement } from "../../../../services/DriverManagementService";
import { getDispatcherId } from "../../../../utils/auth";
import toast from "react-hot-toast";
import { NOTIFICATION_VALIDATION_SCHEMA } from "../../validators/pages/generalNotification.validation";

const userOptions = [
  { value: "all_drivers", label: "All Drivers" },
  { value: "all_users", label: "All Users" },
  { value: "pending_drivers", label: "Pending Drivers" },
  { value: "approved_drivers", label: "Approved Drivers" },
  { value: "rejected_drivers", label: "Rejected Drivers" },
];

const DRIVER_STATUS_BY_TYPE = {
  pending_drivers: "pending",
  approved_drivers: "accepted",
  rejected_drivers: "rejected",
};

const RECIPIENT_FETCH_PAGE_SIZE = 500;

const GeneralNotification = () => {
  const [vehicleList, setVehicleList] = useState([]);
  const [loadingVehicleType, setLoadingVehicleType] = useState(false);
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState(false);
  const dispatcherId = getDispatcherId();

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

  const fetchRecipients = useCallback(async (userType) => {
    if (!userType) {
      setRecipientOptions([]);
      return;
    }

    setLoadingRecipients(true);
    try {
      if (userType === "all_users") {
        const response = await apiGetUser({
          page: 1,
          perPage: RECIPIENT_FETCH_PAGE_SIZE,
          dispatcher_id: dispatcherId,
        });

        const users = response?.data?.users?.data || [];
        setRecipientOptions(
          users.map((user) => ({
            value: String(user.id),
            label: user.email ? `${user.name} (${user.email})` : user.name,
          }))
        );
        return;
      }

      const params = {
        page: 1,
        perPage: RECIPIENT_FETCH_PAGE_SIZE,
        dispatcher_id: dispatcherId,
      };

      const driverStatus = DRIVER_STATUS_BY_TYPE[userType];
      if (driverStatus) {
        params.status = driverStatus;
      }

      const response = await apiGetDriverManagement(params);
      const drivers = response?.data?.list?.data || [];
      setRecipientOptions(
        drivers.map((driver) => ({
          value: String(driver.id),
          label: driver.email ? `${driver.name} (${driver.email})` : driver.name,
        }))
      );
    } catch (error) {
      console.error("Error fetching recipients:", error);
      setRecipientOptions([]);
      toast.error("Failed to load recipients");
    } finally {
      setLoadingRecipients(false);
    }
  }, [dispatcherId]);

  const handleClearForm = (resetForm) => {
    resetForm();
    setRecipientOptions([]);
  };

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-6">
        <PageTitle title="General Notification" />
      </div>

      <CardContainer className="!p-3 sm:!p-4 lg:!px-5 lg:!pt-[30px] lg:!pb-5 2xl:!p-10">
        <Formik
          initialValues={{
            title: "",
            body: "",
            type: "",
            recipients: [],
            vehicleType: "",
          }}
          validationSchema={NOTIFICATION_VALIDATION_SCHEMA}
          onSubmit={async (values, { resetForm }) => {
            try {
              setSending(true);

              const payload = {
                user_type: values.type?.value || values.type,
                title: values.title,
                body: values.body,
                recipient_ids: values.recipients.map(Number),
              };

              if (values.vehicleType) {
                payload.vehicle_id = Number(
                  values.vehicleType?.value || values.vehicleType
                );
              }

              const response = await apiSendNotifiction(payload);
              const responseData = response?.data;

              if (responseData?.success === 1) {
                handleClearForm(resetForm);
                toast.success(
                  responseData.message ||
                    `Notification sent to ${responseData.recipient_count ?? values.recipients.length} recipient(s)`
                );
                return;
              }

              if (responseData?.error === 1) {
                const invalidIds = responseData.invalid_recipient_ids;
                const errorMessage =
                  responseData.message || "Notification send failed";
                toast.error(
                  invalidIds?.length
                    ? `${errorMessage} (Invalid IDs: ${invalidIds.join(", ")})`
                    : errorMessage
                );
                return;
              }

              toast.error(responseData?.message || "Notification send failed");
            } catch (error) {
              const errorData = error?.response?.data;
              if (errorData?.error === 1) {
                const invalidIds = errorData.invalid_recipient_ids;
                const errorMessage =
                  errorData.message || "Notification send failed";
                toast.error(
                  invalidIds?.length
                    ? `${errorMessage} (Invalid IDs: ${invalidIds.join(", ")})`
                    : errorMessage
                );
              } else {
                toast.error(errorData?.message || "Notification send failed");
              }
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
                      onChange={(val) => {
                        setFieldValue("type", val);
                        setFieldValue("recipients", []);
                        fetchRecipients(val);
                      }}
                      placeholder="Select Type"
                      options={userOptions}
                    />
                  </div>
                  <ErrorMessage name="type" component="div" className="text-red-500 text-sm mt-1" />
                </div>

                {values.type && (
                  <div>
                    <FormLabel>Recipients</FormLabel>
                    <FormSelection
                      name="recipients"
                      value={values.recipients}
                      onChange={(val) => setFieldValue("recipients", val)}
                      placeholder={
                        loadingRecipients
                          ? "Loading recipients..."
                          : recipientOptions.length
                            ? "Select one or more recipients"
                            : "No recipients found"
                      }
                      options={recipientOptions}
                      isMulti
                      isDisabled={loadingRecipients || recipientOptions.length === 0}
                      menuPlacement="top"
                    />
                    <ErrorMessage name="recipients" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                )}

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
                    onClick={() => handleClearForm(resetForm)}
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
