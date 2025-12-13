import PageTitle from "../../../../../../components/ui/PageTitle/PageTitle";
import CardContainer from "../../../../../../components/shared/CardContainer";
import Button from "../../../../../../components/ui/Button/Button";

const InputField = ({ label, placeholder }) => (
    <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <input
            type="text"
            placeholder={placeholder}
            className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
        />
    </div>
);

const DriverDetails = () => {
    return (
        <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
            <PageTitle title="Driver Details" />

            <CardContainer className="p-5 mt-4">
                <h2 className="text-[22px] font-semibold mb-4">Driver Details</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField label="Name" placeholder="Enter Name" />
                    <InputField label="Email" placeholder="Enter Email" />
                    <InputField label="Phone Number" placeholder="Enter Phone Number" />

                    <InputField label="Active Package" placeholder="Select Package" />
                    <InputField label="Package Purchased Date" placeholder="Select Date" />
                    <InputField label="Wallet Balance" placeholder="$0.00" />

                    <InputField label="Sub Company" placeholder="Select Sub Company" />
                </div>
            </CardContainer>


            <CardContainer className="p-5 mt-6">
                <h2 className="text-[22px] font-semibold mb-4">Vehicle Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField label="Vehicle Name" placeholder="Enter Vehicle Name" />
                    <InputField label="Vehicle Type" placeholder="Select Vehicle Type" />
                    <InputField label="Vehicle Service" placeholder="Select Vehicle Service" />

                    <InputField label="Seats" placeholder="Select Seats" />
                    <InputField label="Color" placeholder="Select Color" />
                    <InputField label="Plate Number" placeholder="Enter Plate Number" />

                    <InputField label="Vehicle Registration Date" placeholder="Select Date" />
                </div>
            </CardContainer>

            <div className="p-5 mt-6 bg-[#EEF3FF] rounded-xl">
                <h2 className="text-[22px] font-semibold mb-4">Bank Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField label="Bank Name" placeholder="Enter Bank Name" />
                    <InputField label="Bank Account Number" placeholder="Enter Account Number" />
                    <InputField label="Account Holder Name" placeholder="Enter Holder Name" />

                    <InputField label="Bank Phone Number" placeholder="Enter Phone Number" />
                    <InputField label="IBAN Number" placeholder="Enter IBAN Number" />
                </div>
            </div>

            <div className="p-5 mt-6 bg-[#EEF3FF] rounded-xl">
                <div className="flex gap-4 items-center mb-4">
                    <h2 className="text-[22px] font-semibold">Document Information</h2>
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
                            <span
                                className="border border-black py-1 px-2 rounded-sm"
                            >
                                {doc.status}
                            </span>
                            <Button
                                type="filled"
                                className="py-1.5 px-4 rounded-sm leading-[25px] w-full sm:w-auto"
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
