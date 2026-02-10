import { Field, Form, Formik } from "formik";
import { useEffect, useState } from "react";
import FormLabel from "../../../../../../../../components/ui/FormLabel";
import Button from "../../../../../../../../components/ui/Button/Button";
import { unlockBodyScroll } from "../../../../../../../../utils/functions/common.function";

const DocumentModel = ({ initialValue = {}, setIsOpen, }) => {
    const [submitError, setSubmitError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        setIsEditMode(!!initialValue?.id);
    }, [initialValue]);

    const handleSubmit = async (values) => {
        setIsLoading(true);
        setSubmitError(null);
        setTimeout(() => {
            setIsLoading(false);
            unlockBodyScroll();
            setIsOpen(false);
        }, 1000);
    };

    return (
        <div>
            <Formik
                initialValues={{
                    documentName: initialValue?.document_name || "",
                    status: initialValue?.status || "pending",
                    issueDate: initialValue?.has_issue_date || "",
                    expiryDate: initialValue?.has_expiry_date || "",
                    profilePhoto: initialValue?.profile_photo || "",
                    frontPhoto: initialValue?.front_photo || "",
                    backPhoto: initialValue?.back_photo || "",
                    numberField: initialValue?.has_number_field || "",
                }}
                onSubmit={handleSubmit}
                validateOnChange={true}
                validateOnBlur={true}
                enableReinitialize={true}
            >
                {({ values, setFieldValue }) => {
                    return (
                        <div className="w-[500px] max-w-full">
                            <Form>
                                <div className="text-xl sm:text-2xl lg:text-[26px] leading-7 sm:leading-8 lg:leading-9 font-semibold text-[#252525] mb-4 sm:mb-6 lg:mb-7 text-center mx-auto max-w-full sm:max-w-[85%] lg:max-w-[75%] w-full px-2">
                                    <span className="w-full text-center block truncate">
                                        {isEditMode ? 'View Document' : 'Add Document'}
                                    </span>
                                </div>
                                {submitError && (
                                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                        {submitError}
                                    </div>
                                )}
                                <div className="mb-6">
                                    {values.documentName && (
                                        <div className="w-full mb-4">
                                            <FormLabel htmlFor="documentName">Document Name</FormLabel>
                                            <div className="h-12">
                                                <Field
                                                    type="text"
                                                    name="documentName"
                                                    disabled={isEditMode}
                                                    className="px-4 py-3 border border-[#8D8D8D] rounded-lg w-full h-full placeholder:text-[#6C6C6C] text-sm font-medium disabled:bg-gray-100 disabled:text-gray-600"
                                                    placeholder="Enter Document Name"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {values.issueDate && (
                                        <div className="w-full mb-4">
                                            <FormLabel htmlFor="issueDate">Issue Date</FormLabel>
                                            <div className="h-12">
                                                <Field
                                                    type="text"
                                                    name="issueDate"
                                                    disabled={isEditMode}
                                                    className="px-4 py-3 border border-[#8D8D8D] rounded-lg w-full h-full placeholder:text-[#6C6C6C] text-sm font-medium disabled:bg-gray-100 disabled:text-gray-600"
                                                    placeholder="Issue Date"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {values.expiryDate && (
                                        <div className="w-full mb-4">
                                            <FormLabel htmlFor="expiryDate">Expiry Date</FormLabel>
                                            <div className="h-12">
                                                <Field
                                                    type="text"
                                                    name="expiryDate"
                                                    disabled={isEditMode}
                                                    className="px-4 py-3 border border-[#8D8D8D] rounded-lg w-full h-full placeholder:text-[#6C6C6C] text-sm font-medium disabled:bg-gray-100 disabled:text-gray-600"
                                                    placeholder="Expiry Date"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {values.numberField && (
                                        <div className="w-full mb-4">
                                            <FormLabel htmlFor="numberField">Number</FormLabel>
                                            <div className="h-12">
                                                <Field
                                                    type="text"
                                                    name="numberField"
                                                    disabled={isEditMode}
                                                    className="px-4 py-3 border border-[#8D8D8D] rounded-lg w-full h-full placeholder:text-[#6C6C6C] text-sm font-medium disabled:bg-gray-100 disabled:text-gray-600"
                                                    placeholder="Number"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {(values.frontPhoto || values.backPhoto || values.profilePhoto) && (
                                        <div className="flex flex-col gap-4 mt-4">
                                            {values.frontPhoto && (
                                                <div className="w-full">
                                                    <FormLabel>Front Photo</FormLabel>
                                                    <div className="w-full border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                                                        <img
                                                            src={`${import.meta.env.VITE_BACKEND_URL}${values.frontPhoto}`}
                                                            className="w-full h-48 object-cover"
                                                            alt="Front"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {values.backPhoto && (
                                                <div className="w-full">
                                                    <FormLabel>Back Photo</FormLabel>
                                                    <div className="w-full border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                                                        <img
                                                            src={`${import.meta.env.VITE_BACKEND_URL}${values.backPhoto}`}
                                                            className="w-full h-48 object-cover"
                                                            alt="Back"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {values.profilePhoto && (
                                                <div className="w-full">
                                                    <FormLabel>Profile Photo</FormLabel>
                                                    <div className="w-full border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                                                        <img
                                                            src={`${import.meta.env.VITE_BACKEND_URL}${values.profilePhoto}`}
                                                            className="w-full h-48 object-cover"
                                                            alt="Profile"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-end">
                                    <Button
                                        btnSize="md"
                                        type="filledGray"
                                        className="!px-10 pt-4 pb-[15px] leading-[25px] w-full sm:w-auto"
                                        onClick={() => {
                                            unlockBodyScroll();
                                            setIsOpen(false);
                                        }}
                                    >
                                        <span>{isEditMode ? 'Close' : 'Cancel'}</span>
                                    </Button>
                                    {!isEditMode && (
                                        <Button
                                            btnType="submit"
                                            btnSize="md"
                                            type="filled"
                                            className="!px-10 pt-4 pb-[15px] leading-[25px] w-full sm:w-auto"
                                            disabled={isLoading}
                                        >
                                            <span>{isLoading ? "Submitting..." : "Add Document"}</span>
                                        </Button>
                                    )}
                                </div>
                            </Form>
                        </div>
                    );
                }}
            </Formik>
        </div>
    );
};

export default DocumentModel;