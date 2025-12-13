import PageTitle from "../../../../../../components/ui/PageTitle/PageTitle";
import CardContainer from "../../../../../../components/shared/CardContainer";
import Button from "../../../../../../components/ui/Button/Button";

const FormField = ({ label, type = "text", placeholder, options = [] }) => {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
                {label}
            </label>

            {type === "select" ? (
                <select className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600">
                    <option value="">{placeholder}</option>
                    {options.map((opt, index) => (
                        <option key={index} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
            ) : type === "date" ? (
                <input
                    type="date"
                    className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
                />
            ) : (
                <input
                    type="text"
                    placeholder={placeholder}
                    className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
                />
            )}
        </div>
    );
};

const DriverDetails = () => {
    return (
        <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
            <PageTitle title="Driver Details" />
            <CardContainer className="p-5 mt-4">
                <h2 className="text-[22px] font-semibold mb-4">
                    Driver Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="Name" placeholder="Enter Name" />
                    <FormField label="Email" placeholder="Enter Email" />
                    <FormField label="Phone Number" placeholder="Enter Phone Number" />

                    <FormField
                        label="Active Package"
                        type="select"
                        placeholder="Select Package"
                        options={["Basic", "Standard", "Premium"]}
                    />

                    <FormField
                        label="Package Purchased Date"
                        type="date"
                    />

                    <FormField label="Wallet Balance" placeholder="$0.00" />

                    <FormField
                        label="Sub Company"
                        type="select"
                        placeholder="Select Sub Company"
                        options={["Company A", "Company B", "Company C"]}
                    />
                </div>
            </CardContainer>

            <CardContainer className="p-5 mt-6">
                <h2 className="text-[22px] font-semibold mb-4">
                    Vehicle Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="Vehicle Name" placeholder="Enter Vehicle Name" />

                    <FormField
                        label="Vehicle Type"
                        type="select"
                        placeholder="Select Vehicle Type"
                        options={["Sedan", "SUV", "Hatchback", "Van"]}
                    />

                    <FormField
                        label="Vehicle Service"
                        type="select"
                        placeholder="Select Vehicle Service"
                        options={["Taxi", "Rental", "Delivery"]}
                    />

                    <FormField
                        label="Seats"
                        type="select"
                        placeholder="Select Seats"
                        options={["2", "4", "5", "7", "8"]}
                    />

                    <FormField
                        label="Color"
                        type="select"
                        placeholder="Select Color"
                        options={["Black", "White", "Red", "Blue", "Silver"]}
                    />

                    <FormField label="Plate Number" placeholder="Enter Plate Number" />

                    <FormField
                        label="Vehicle Registration Date"
                        type="date"
                    />
                </div>
            </CardContainer>

            <div className="p-5 mt-6 bg-[#EEF3FF] rounded-xl">
                <h2 className="text-[22px] font-semibold mb-4">
                    Bank Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="Bank Name" placeholder="Enter Bank Name" />
                    <FormField label="Bank Account Number" placeholder="Enter Account Number" />
                    <FormField label="Account Holder Name" placeholder="Enter Holder Name" />
                    <FormField label="Bank Phone Number" placeholder="Enter Phone Number" />
                    <FormField label="IBAN Number" placeholder="Enter IBAN Number" />
                </div>
            </div>

            <div className="p-5 mt-6 bg-[#EEF3FF] rounded-xl">
                <div className="flex gap-4 items-center mb-4">
                    <h2 className="text-[22px] font-semibold">
                        Document Information
                    </h2>
                    <span className="bg-[#10B981] text-white text-sm px-3 py-1 rounded-full">
                        Approved in office
                    </span>
                </div>

                {[
                    { title: "Driver License", status: "Approved" },
                    { title: "Vehicle Registration", status: "Pending" },
                    { title: "Vehicle Photo", status: "Approved" },
                ].map((doc, index) => (
                    <div
                        key={index}
                        className="flex justify-between items-center bg-white p-4 rounded-lg mb-3"
                    >
                        <span className="font-medium">{doc.title}</span>

                        <div className="flex items-center gap-3">
                            <span className="border border-black py-1 px-2 rounded-sm">
                                {doc.status}
                            </span>
                            <Button
                                type="filled"
                                className="py-1.5 px-4 rounded-sm leading-[25px]"
                            >
                                View
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DriverDetails;
