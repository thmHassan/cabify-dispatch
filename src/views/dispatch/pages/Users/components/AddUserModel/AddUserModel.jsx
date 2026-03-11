import { ErrorMessage, Field, Form, Formik } from "formik";
import { useEffect, useState } from "react";
import FormLabel from "../../../../../../components/ui/FormLabel/FormLabel";
import Password from "../../../../../../components/elements/CustomPassword/Password";
import { unlockBodyScroll } from "../../../../../../utils/functions/common.function";
import Button from "../../../../../../components/ui/Button/Button";
import { apiCreateUser, apiEditUser } from "../../../../../../services/UserService";
import { getDispatcherId } from "../../../../../../utils/auth";
import toast from "react-hot-toast";
import { USER_VALIDATION_SCHEMA } from "../../../../validators/pages/user.validation";
import { getTenantData } from "../../../../../../utils/functions/tokenEncryption";

const COUNTRY_CODE_MAP = {
    AF: "+93", AC: "+247", AL: "+355", DZ: "+213", AD: "+376",
    AO: "+244", AI: "+1264", AG: "+1268", AR: "+54", AM: "+374",
    AW: "+297", AU: "+61", AT: "+43", AZ: "+994", BS: "+1242",
    BH: "+973", BD: "+880", BB: "+1246", BY: "+375", BE: "+32",
    BZ: "+501", BJ: "+229", BM: "+1441", BT: "+975", BO: "+591",
    BA: "+387", BW: "+267", BR: "+55", BN: "+673", BG: "+359",
    BF: "+226", BI: "+257", KH: "+855", CM: "+237", CA: "+1",
    CV: "+238", KY: "+1345", CF: "+236", TD: "+235", CL: "+56",
    CN: "+86", CO: "+57", KM: "+269", CG: "+242", CD: "+243",
    CK: "+682", CR: "+506", HR: "+385", CU: "+53", CY: "+357",
    CZ: "+420", DK: "+45", DJ: "+253", DM: "+1767", DO: "+1809",
    EC: "+593", EG: "+20", SV: "+503", GQ: "+240", ER: "+291",
    EE: "+372", ET: "+251", FK: "+500", FO: "+298", FJ: "+679",
    FI: "+358", FR: "+33", GF: "+594", PF: "+689", GA: "+241",
    GM: "+220", GE: "+995", DE: "+49", GH: "+233", GI: "+350",
    GR: "+30", GL: "+299", GD: "+1473", GP: "+590", GU: "+1671",
    GT: "+502", GN: "+224", GW: "+245", GY: "+592", HT: "+509",
    HN: "+504", HK: "+852", HU: "+36", IS: "+354", IN: "+91",
    ID: "+62", IR: "+98", IQ: "+964", IE: "+353", IL: "+972",
    IT: "+39", JM: "+1876", JP: "+81", JO: "+962", KZ: "+7",
    KE: "+254", KI: "+686", KP: "+850", KR: "+82", KW: "+965",
    KG: "+996", LA: "+856", LV: "+371", LB: "+961", LS: "+266",
    LR: "+231", LY: "+218", LI: "+423", LT: "+370", LU: "+352",
    MO: "+853", MK: "+389", MG: "+261", MW: "+265", MY: "+60",
    MV: "+960", ML: "+223", MT: "+356", MH: "+692", MQ: "+596",
    MR: "+222", MU: "+230", MX: "+52", FM: "+691", MD: "+373",
    MC: "+377", MN: "+976", ME: "+382", MS: "+1664", MA: "+212",
    MZ: "+258", MM: "+95", NA: "+264", NR: "+674", NP: "+977",
    NL: "+31", NZ: "+64", NI: "+505", NE: "+227", NG: "+234",
    NU: "+683", NF: "+672", NO: "+47", OM: "+968", PK: "+92",
    PW: "+680", PS: "+970", PA: "+507", PG: "+675", PY: "+595",
    PE: "+51", PH: "+63", PL: "+48", PT: "+351", PR: "+1787",
    QA: "+974", RE: "+262", RO: "+40", RU: "+7", RW: "+250",
    KN: "+1869", LC: "+1758", VC: "+1784", WS: "+685", SM: "+378",
    ST: "+239", SA: "+966", SN: "+221", RS: "+381", SC: "+248",
    SL: "+232", SG: "+65", SK: "+421", SI: "+386", SB: "+677",
    SO: "+252", ZA: "+27", SS: "+211", ES: "+34", LK: "+94",
    SD: "+249", SR: "+597", SZ: "+268", SE: "+46", CH: "+41",
    SY: "+963", TW: "+886", TJ: "+992", TZ: "+255", TH: "+66",
    TL: "+670", TG: "+228", TO: "+676", TT: "+1868", TN: "+216",
    TR: "+90", TM: "+993", TC: "+1649", TV: "+688", UG: "+256",
    UA: "+380", AE: "+971", GB: "+44", US: "+1", UY: "+598",
    UZ: "+998", VU: "+678", VE: "+58", VN: "+84", VG: "+1284",
    VI: "+1340", YE: "+967", ZM: "+260", ZW: "+263",
};

const AddUserModel = ({ initialValue = {}, setIsOpen, onUserCreated }) => {
    const [submitError, setSubmitError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const tenantData = getTenantData();

    // ✅ Get country code from tenant's country_of_use (e.g. "AU" → "+61")
    const defaultCountryCode =
        COUNTRY_CODE_MAP[tenantData?.data?.country_of_use?.toUpperCase() || tenantData?.country_of_use?.toUpperCase()] || "";

    const handleSubmit = async (values) => {
        setIsLoading(true);
        setSubmitError(null);

        try {
            const dispatcherId = getDispatcherId();
            const formDataObj = new FormData();

            if (isEditMode) {
                formDataObj.append('id', initialValue.id);
            }

            formDataObj.append("dispatcher_id", dispatcherId);
            formDataObj.append('name', values.name || '');
            formDataObj.append('email', values.email || '');
            formDataObj.append("country_code", values.country_code || "");
            formDataObj.append('phone_no', values.phoneNumber || '');
            formDataObj.append('address', values.address || '');
            formDataObj.append('city', values.city || '');

            if (isEditMode) {
                const passwordToSend = values.password.trim() !== ''
                    ? values.password
                    : initialValue.original_password || '';
                if (passwordToSend) {
                    formDataObj.append('password', passwordToSend);
                }
            } else {
                formDataObj.append('password', values.password);
            }

            const response = isEditMode
                ? await apiEditUser(formDataObj)
                : await apiCreateUser(formDataObj);

            if (response?.data?.success === 1 || response?.status === 200) {
                toast.success(isEditMode ? 'User updated successfully!' : 'User created successfully!');
                if (onUserCreated) onUserCreated();
                unlockBodyScroll();
                setIsOpen({ type: "new", isOpen: false });
            } else {
                const errorMsg = response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} user`;
                setSubmitError(errorMsg);
                toast.error(errorMsg);
            }
        } catch (error) {
            const errorMsg = error?.response?.data?.message || error?.message || `Error ${isEditMode ? 'updating' : 'creating'} user`;
            setSubmitError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setIsEditMode(!!(initialValue && initialValue.id));
    }, [initialValue]);

    return (
        <div>
            <Formik
                initialValues={{
                    name: initialValue.name || '',
                    email: initialValue.email || '',
                    // ✅ Edit mode: user's saved country_code | Add mode: tenant's country code
                    country_code: initialValue.country_code || defaultCountryCode,
                    phoneNumber: initialValue.phone_no || '',
                    password: '',
                    address: initialValue.address || '',
                    city: initialValue.city || '',
                    isEditMode,
                }}
                validationSchema={USER_VALIDATION_SCHEMA}
                onSubmit={handleSubmit}
                validateOnChange={true}
                validateOnBlur={true}
                enableReinitialize={true}
            >
                {({ values, setFieldValue }) => (
                    <Form>
                        <div className="text-xl sm:text-2xl lg:text-[26px] leading-7 sm:leading-8 lg:leading-9 font-semibold text-[#252525] mb-4 sm:mb-6 lg:mb-7 text-center mx-auto max-w-full sm:max-w-[85%] lg:max-w-[75%] w-full px-2">
                            <span className="w-full text-center block truncate">
                                {isEditMode ? 'Edit User' : 'Add User'}
                            </span>
                        </div>

                        {submitError && (
                            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                {submitError}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-5 mb-6 sm:mb-[60px]">
                            <div className="w-[calc((100%-20px)/2)]">
                                <FormLabel htmlFor="name">Name</FormLabel>
                                <div className="sm:h-16 h-14">
                                    <Field
                                        type="text"
                                        name="name"
                                        className="sm:px-5 px-4 sm:py-[21px] py-4 border border-[#8D8D8D] rounded-lg w-full h-full shadow-[-4px_4px_6px_0px_#0000001F] placeholder:text-[#6C6C6C] sm:text-base text-sm leading-[22px] font-semibold"
                                        placeholder="Enter Name"
                                    />
                                </div>
                                <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
                            </div>

                            <div className="w-[calc((100%-20px)/2)]">
                                <FormLabel htmlFor="email">Email</FormLabel>
                                <div className="sm:h-16 h-14">
                                    <Field
                                        type="text"
                                        name="email"
                                        className="sm:px-5 px-4 sm:py-[21px] py-4 border border-[#8D8D8D] rounded-lg w-full h-full shadow-[-4px_4px_6px_0px_#0000001F] placeholder:text-[#6C6C6C] sm:text-base text-sm leading-[22px] font-semibold"
                                        placeholder="Enter Email"
                                    />
                                </div>
                                <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
                            </div>

                            {/* ✅ Phone Number — static badge, no dropdown */}
                            <div className="w-[calc((100%-20px)/2)]">
                                <FormLabel htmlFor="phoneNumber">Phone Number</FormLabel>
                                <div className="flex items-center border border-[#8D8D8D] rounded-lg shadow-[-4px_4px_6px_0px_#0000001F] overflow-hidden sm:h-16 h-14">
                                    {/* Add: tenant's default code | Edit: user's saved code */}
                                    <div className="h-full px-3 sm:px-4 bg-gray-100 border-r border-[#8D8D8D] flex items-center font-semibold text-[#252525] sm:text-base text-sm whitespace-nowrap">
                                        {values.country_code || defaultCountryCode || "+1"}
                                    </div>
                                    <Field
                                        type="text"
                                        name="phoneNumber"
                                        className="flex-1 h-full sm:px-5 px-4 outline-none placeholder:text-[#6C6C6C] sm:text-base text-sm font-semibold"
                                        placeholder="Enter phone number"
                                    />
                                </div>
                                <ErrorMessage name="phoneNumber" component="div" className="text-red-500 text-sm mt-1" />
                            </div>

                            <div className="w-[calc((100%-20px)/2)]">
                                <FormLabel htmlFor="address">Address</FormLabel>
                                <div className="sm:h-16 h-14">
                                    <Field
                                        type="text"
                                        name="address"
                                        className="sm:px-5 px-4 sm:py-[21px] py-4 border border-[#8D8D8D] rounded-lg w-full h-full shadow-[-4px_4px_6px_0px_#0000001F] placeholder:text-[#6C6C6C] sm:text-base text-sm leading-[22px] font-semibold"
                                        placeholder="Enter address"
                                    />
                                </div>
                                <ErrorMessage name="address" component="div" className="text-red-500 text-sm mt-1" />
                            </div>

                            <div className="w-[calc((100%-20px)/2)]">
                                <FormLabel htmlFor="city">City</FormLabel>
                                <div className="sm:h-16 h-14">
                                    <Field
                                        type="text"
                                        name="city"
                                        className="sm:px-5 px-4 sm:py-[21px] py-4 border border-[#8D8D8D] rounded-lg w-full h-full shadow-[-4px_4px_6px_0px_#0000001F] placeholder:text-[#6C6C6C] sm:text-base text-sm leading-[22px] font-semibold"
                                        placeholder="Enter city"
                                    />
                                </div>
                                <ErrorMessage name="city" component="div" className="text-red-500 text-sm mt-1" />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-end">
                            <Button
                                btnSize="md"
                                type="filledGray"
                                className="!px-10 pt-4 pb-[15px] leading-[25px] w-full sm:w-auto"
                                onClick={() => {
                                    unlockBodyScroll();
                                    setIsOpen({ type: "new", isOpen: false });
                                }}
                            >
                                <span>Cancel</span>
                            </Button>
                            <Button
                                btnType="submit"
                                btnSize="md"
                                type="filled"
                                className="!px-10 pt-4 pb-[15px] leading-[25px] w-full sm:w-auto"
                                disabled={isLoading}
                            >
                                <span>
                                    {isLoading
                                        ? (isEditMode ? "Updating..." : "Creating...")
                                        : (isEditMode ? "Update" : "Submit")}
                                </span>
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default AddUserModel;