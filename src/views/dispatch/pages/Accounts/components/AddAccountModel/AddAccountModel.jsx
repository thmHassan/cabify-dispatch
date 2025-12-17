import { ErrorMessage, Field, Form, Formik } from "formik";
import React, { useEffect, useState } from "react";
import * as Yup from "yup";
import FormLabel from "../../../../../../components/ui/FormLabel/FormLabel";
import { unlockBodyScroll } from "../../../../../../utils/functions/common.function";
import Button from "../../../../../../components/ui/Button/Button";
import { apiCreateAccount, apiEditAccount } from "../../../../../../services/AccountServices";


const ACCOUNT_VALIDATION_SCHEMA = Yup.object().shape({
    name: Yup.string().required("Name is required"),
    email: Yup.string().email("Invalid email").required("Email is required"),
    phone_no: Yup.string().required("Phone number is required"),
    address: Yup.string().required("Address is required"),
    notes: Yup.string(),
});

const AddAccountModel = ({ initialValue = {}, setIsOpen, onAccountCreated }) => {
    const [submitError, setSubmitError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        setIsEditMode(!!initialValue?.id);
    }, [initialValue]);

    const handleSubmit = async (values) => {
        setIsLoading(true);
        setSubmitError(null);

        try {
            const formDataObj = new FormData();
            if (isEditMode) {
                formDataObj.append('id', initialValue.id);
            }
            formDataObj.append('name', values.name || '');
            formDataObj.append('email', values.email || '');
            formDataObj.append('phone_no', values.phone_no || '');
            formDataObj.append('address', values.address || '');
            formDataObj.append('notes', values.notes || '');

            const response = isEditMode
                ? await apiEditAccount(formDataObj)
                : await apiCreateAccount(formDataObj);

            if (response?.data?.success === 1 || response?.status === 200) {
                if (onAccountCreated) {
                    onAccountCreated();
                }
                unlockBodyScroll();
                setIsOpen({ type: "new", isOpen: false });
            } else {
                setSubmitError(response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} account`);
            }
        } catch (error) {
            setSubmitError(error?.response?.data?.message || error?.message || `Error ${isEditMode ? 'updating' : 'creating'} account`);
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div>
            <Formik
                initialValues={{
                    name: initialValue?.name || "",
                    email: initialValue?.email || "",
                    phone_no: initialValue?.phone_no || "",
                    address: initialValue?.address || "",
                    notes: initialValue?.notes || "",
                }}
                validationSchema={ACCOUNT_VALIDATION_SCHEMA}
                onSubmit={handleSubmit}
                validateOnChange={true}
                validateOnBlur={true}
                enableReinitialize={true}
            >
                {({ values, setFieldValue }) => {
                    return (
                        <Form>
                            <div className="text-xl sm:text-2xl lg:text-[26px] leading-7 sm:leading-8 lg:leading-9 font-semibold text-[#252525] mb-4 sm:mb-6 lg:mb-7 text-center mx-auto max-w-full sm:max-w-[85%] lg:max-w-[75%] w-full px-2">
                                <span className="w-full text-center block truncate">
                                    {isEditMode ? 'Edit Account' : 'Add Account'}
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
                                    <ErrorMessage
                                        name="name"
                                        component="div"
                                        className="text-red-500 text-sm mt-1"
                                    />
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
                                    <ErrorMessage
                                        name="email"
                                        component="div"
                                        className="text-red-500 text-sm mt-1"
                                    />
                                </div>
                                <div className="w-[calc((100%-20px)/2)]">
                                    <FormLabel htmlFor="phone_no">Phone Number</FormLabel>
                                    <div className="sm:h-16 h-14">
                                        <Field
                                            type="text"
                                            name="phone_no"
                                            className="sm:px-5 px-4 sm:py-[21px] py-4 border border-[#8D8D8D] rounded-lg w-full h-full shadow-[-4px_4px_6px_0px_#0000001F] placeholder:text-[#6C6C6C] sm:text-base text-sm leading-[22px] font-semibold"
                                            placeholder="Enter Phone Number"
                                        />
                                    </div>
                                    <ErrorMessage
                                        name="phone_no"
                                        component="div"
                                        className="text-red-500 text-sm mt-1"
                                    />
                                </div>
                                <div className="w-[calc((100%-20px)/2)]">
                                    <FormLabel htmlFor="address">Address</FormLabel>
                                    <div className="sm:h-16 h-14">
                                        <Field
                                            type="text"
                                            name="address"
                                            className="sm:px-5 px-4 sm:py-[21px] py-4 border border-[#8D8D8D] rounded-lg w-full h-full shadow-[-4px_4px_6px_0px_#0000001F] placeholder:text-[#6C6C6C] sm:text-base text-sm leading-[22px] font-semibold"
                                            placeholder="Enter Address"
                                        />
                                    </div>
                                    <ErrorMessage
                                        name="address"
                                        component="div"
                                        className="text-red-500 text-sm mt-1"
                                    />
                                </div>
                                <div className="w-[calc((100%-20px)/2)]">
                                    <FormLabel htmlFor="notes">Notes</FormLabel>
                                    <div className="sm:h-16 h-14">
                                        <Field
                                            type="text"
                                            name="notes"
                                            className="sm:px-5 px-4 sm:py-[21px] py-4 border border-[#8D8D8D] rounded-lg w-full h-full shadow-[-4px_4px_6px_0px_#0000001F] placeholder:text-[#6C6C6C] sm:text-base text-sm leading-[22px] font-semibold"
                                            placeholder="Enter Notes"
                                        />
                                    </div>
                                    <ErrorMessage
                                        name="notes"
                                        component="div"
                                        className="text-red-500 text-sm mt-1"
                                    />
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
                    );
                }}
            </Formik>
        </div>
    );
};

export default AddAccountModel;
