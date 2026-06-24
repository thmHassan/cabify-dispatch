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

const RECIPIENT_TYPE_OPTIONS = [
  { value: "all_drivers", label: "All Drivers" },
  { value: "all_users", label: "All Users" },
  { value: "individual_drivers", label: "Individual Drivers" },
  { value: "individual_users", label: "Individual Users" },
];

const BROADCAST_RECIPIENT_TYPES = new Set(["all_drivers", "all_users"]);
const INDIVIDUAL_RECIPIENT_TYPES = new Set(["individual_drivers", "individual_users"]);

const RECIPIENT_FETCH_PAGE_SIZE = 500;

const resolveRecipientType = (type) => type?.value || type || "";

const isIndividualRecipientType = (type) =>
  INDIVIDUAL_RECIPIENT_TYPES.has(resolveRecipientType(type));

const isBroadcastRecipientType = (type) =>
  BROADCAST_RECIPIENT_TYPES.has(resolveRecipientType(type));

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

  const fetchRecipients = useCallback(async (recipientType) => {
    const type = resolveRecipientType(recipientType);

    if (!isIndividualRecipientType(type)) {
      setRecipientOptions([]);
      return;
    }

    setLoadingRecipients(true);
    try {
      if (type === "individual_users") {
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

      const response = await apiGetDriverManagement({
        page: 1,
        perPage: RECIPIENT_FETCH_PAGE_SIZE,
        dispatcher_id: dispatcherId,
      });

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

  const getSuccessMessage = (responseData, values) => {
    if (responseData?.message) return responseData.message;

    const recipientType = resolveRecipientType(values.type);
    if (recipientType === "all_drivers") {
      return `Notification sent to all drivers (${responseData?.recipient_count ?? "all"})`;
    }
    if (recipientType === "all_users") {
      return `Notification sent to all users (${responseData?.recipient_count ?? "all"})`;
    }

    const count = responseData?.recipient_count ?? values.recipients.length;
    return `Notification sent to ${count} recipient(s)`;
  };

  const handleSendError = (errorData) => {
    const invalidIds = errorData?.invalid_recipient_ids;
    const errorMessage = errorData?.message || "Notification send failed";
    toast.error(
      invalidIds?.length
        ? `${errorMessage} (Invalid IDs: ${invalidIds.join(", ")})`
        : errorMessage
    );
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

              const recipientType = resolveRecipientType(values.type);
              const isIndividual = isIndividualRecipientType(recipientType);

              const payload = {
                user_type: recipientType,
                title: values.title,
                body: values.body,
                recipient_ids: isIndividual
                  ? values.recipients.map(Number)
                  : [],
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
                toast.success(getSuccessMessage(responseData, values));
                return;
              }

              if (responseData?.error === 1) {
                handleSendError(responseData);
                return;
              }

              toast.error(responseData?.message || "Notification send failed");
            } catch (error) {
              const errorData = error?.response?.data;
              if (errorData?.error === 1) {
                handleSendError(errorData);
              } else {
                toast.error(errorData?.message || "Notification send failed");
              }
              console.error("Notification send failed:", error);
            } finally {
              setSending(false);
            }
          }}
        >
          {({ values, setFieldValue, handleSubmit, resetForm }) => {
            const recipientType = resolveRecipientType(values.type);
            const showIndividualRecipients = isIndividualRecipientType(recipientType);
            const isBroadcast = isBroadcastRecipientType(recipientType);

            return (
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
                    <FormLabel>Send To</FormLabel>
                    <div className="sm:h-16 h-14">
                      <FormSelection
                        name="type"
                        value={values.type}
                        onChange={(val) => {
                          setFieldValue("type", val);
                          setFieldValue("recipients", []);
                          fetchRecipients(val);
                        }}
                        placeholder="Select recipients"
                        options={RECIPIENT_TYPE_OPTIONS}
                      />
                    </div>
                    <ErrorMessage name="type" component="div" className="text-red-500 text-sm mt-1" />
                    {isBroadcast && (
                      <p className="text-sm text-[#6B7280] mt-2">
                        {recipientType === "all_drivers"
                          ? "This notification will be sent to all drivers."
                          : "This notification will be sent to all users."}
                      </p>
                    )}
                  </div>

                  {showIndividualRecipients && (
                    <div>
                      <FormLabel>
                        {recipientType === "individual_drivers"
                          ? "Select Drivers"
                          : "Select Users"}
                      </FormLabel>
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
            );
          }}
        </Formik>
      </CardContainer>
    </div>
  );
};

export default GeneralNotification;
