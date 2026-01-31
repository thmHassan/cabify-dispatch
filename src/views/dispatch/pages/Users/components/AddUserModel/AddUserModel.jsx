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

const AddUserModel = ({ initialValue = {}, setIsOpen, onUserCreated }) => {
    const [submitError, setSubmitError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

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
            formDataObj.append('phone_no', values.phoneNumber || '');
            formDataObj.append('address', values.address || '');
            formDataObj.append('city', values.city || '');

            // Password handling: 
            // - In create mode: always send the password
            // - In edit mode: only send if password field has been changed (not empty)
            //   Otherwise send the original password from initialValue
            if (isEditMode) {
                // If user typed a new password, use it; otherwise use the original password
                const passwordToSend = values.password.trim() !== ''
                    ? values.password
                    : initialValue.original_password || '';

                if (passwordToSend) {
                    formDataObj.append('password', passwordToSend);
                }
            } else {
                // Create mode: password is required
                formDataObj.append('password', values.password);
            }

            const response = isEditMode
                ? await apiEditUser(formDataObj)
                : await apiCreateUser(formDataObj);

            if (response?.data?.success === 1 || response?.status === 200) {
                // Success toast
                toast.success(
                    isEditMode ? 'User updated successfully!' : 'User created successfully!',
                );

                if (onUserCreated) {
                    onUserCreated();
                }
                unlockBodyScroll();
                setIsOpen({ type: "new", isOpen: false });
            } else {
                const errorMsg = response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} user`;
                setSubmitError(errorMsg);
                // Error toast
                toast.error(errorMsg, {
                });
            }
        } catch (error) {
            const errorMsg = error?.response?.data?.message || error?.message || `Error ${isEditMode ? 'updating' : 'creating'} user`;
            setSubmitError(errorMsg);
            // Error toast
            toast.error(errorMsg, {
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (initialValue && initialValue.id) {
            setIsEditMode(true);
        } else {
            setIsEditMode(false);
        }
    }, [initialValue]);

    return (
        <div>
            <Formik
                initialValues={{
                    name: initialValue.name || '',
                    email: initialValue.email || '',
                    phoneNumber: initialValue.phone_no || '',
                    password: '', // Always empty - user will type new password if they want to change
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

                            <div className="w-[calc((100%-20px)/2)]">
                                <FormLabel htmlFor="phone-number">Phone Number</FormLabel>
                                <div className="sm:h-16 h-14">
                                    <Field
                                        type="text"
                                        name="phoneNumber"
                                        className="sm:px-5 px-4 sm:py-[21px] py-4 border border-[#8D8D8D] rounded-lg w-full h-full shadow-[-4px_4px_6px_0px_#0000001F] placeholder:text-[#6C6C6C] sm:text-base text-sm leading-[22px] font-semibold"
                                        placeholder="Enter Phone Number"
                                    />
                                </div>
                                <ErrorMessage name="phoneNumber" component="div" className="text-red-500 text-sm mt-1" />
                            </div>

                            <div className="w-full sm:w-[calc((100%-20px)/2)]">
                                <FormLabel htmlFor="password">
                                    Password {isEditMode && <span className="text-gray-500 text-sm">(Leave empty to keep current password)</span>}
                                </FormLabel>
                                <div className="sm:h-16 h-14">
                                    <Password
                                        name="password"
                                        className="sm:px-5 px-4 sm:py-[21px] py-4 !select-none border border-[#8D8D8D] rounded-lg w-full h-14 sm:h-16 shadow-[-4px_4px_6px_0px_#0000001F] placeholder:text-[#6C6C6C] sm:text-base text-sm leading-[22px] font-semibold"
                                        placeholder={isEditMode ? "Enter new password (optional)" : "Enter password"}
                                        autoComplete="off"
                                    />
                                </div>
                                <ErrorMessage name="password" component="div" className="text-red-500 text-sm mt-1" />
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
                                <span>{isLoading ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update" : "Submit")}</span>
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default AddUserModel;