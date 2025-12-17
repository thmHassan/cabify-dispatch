
import { ErrorMessage, Field, Form, Formik } from "formik";
import { useRef, useState, useEffect } from "react";
import { unlockBodyScroll } from "../../../../../../utils/functions/common.function";
import Button from "../../../../../../components/ui/Button/Button";

const AddBookingModel = ({ initialValue = {}, setIsOpen }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [destinationPlotData, setDestinationPlotData] = useState("");
    const [viaPoints, setViaPoints] = useState([]);
    const [mapUrl, setMapUrl] = useState("https://www.google.com/maps/embed");
    const [destinationCoords, setDestinationCoords] = useState(null);
    const [destinationBarikoiSuggestions, setDestinationBarikoiSuggestions] = useState([]);
    const [showDestinationBarikoiSuggestions, setShowDestinationBarikoiSuggestions] = useState(false);
    const [activeSearchField, setActiveSearchField] = useState(null);
    const [viaBarikoiSuggestions, setViaBarikoiSuggestions] = useState({});
    const [loadingDestinationPlot, setLoadingDestinationPlot] = useState(false);
    const setFieldValueRef = useRef(null);
    const [isCalculatingFares, setIsCalculatingFares] = useState(false);


    return (
        <div>
            <Formik
                initialValues={{
                }}
            >
                {({ values, setFieldValue }) => {
                    return (
                        <Form>
                            <div className="w-full">
                                <div className="space-y-4 w-full">
                                    <div class="w-full flex max-sm:flex-col md:items-center gap-4">
                                        <h2 className="text-x font-semibold">Create New Booking</h2>
                                        <div className="flex md:flex-row flex-col md:gap-4 gap-0 md:items-center">
                                            <div className="md:w-72 w-full">

                                                <select
                                                    name="sub_company"
                                                    value={values.sub_company || ""}
                                                    className="w-full border-[1.5px] border-[#8D8D8D] px-3 py-2 rounded-[8px]"
                                                >
                                                    <option value="">Select Sub Company</option>
                                                </select>
                                            </div>

                                            <ErrorMessage
                                                name="sub_company"
                                                component="div"
                                                className="text-red-500 text-sm mt-1"
                                            />
                                        </div>
                                        <div class="flex items-center max-sm:justify-center rounded-[8px] px-3 py-2 border-[1.5px] shadow-lg border-[#8D8D8D]">
                                            <span class="text-sm mr-2">Single Booking</span>

                                            <label class="relative inline-flex items-center cursor-pointer ">
                                                <input
                                                    type="checkbox"
                                                    class="sr-only peer"
                                                    checked={values.multi_booking === "yes"}
                                                />
                                                <div class="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-green-400 transition-all"></div>
                                                <div
                                                    class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-all">
                                                </div>
                                            </label>
                                            <span className="text-sm ml-2">Multi Booking</span>
                                        </div>

                                    </div>


                                    <div className="w-full bg-white">
                                        <div className="flex lg:flex-row md:flex-col flex-col gap-4">

                                            <div className="lg:col-span-3 space-y-4">
                                                {values.multi_booking === "yes" && (
                                                    <div className="w-full space-y-3">
                                                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">

                                                            <span className="font-semibold text-sm sm:text-base">
                                                                Select day of the week
                                                            </span>

                                                            <div className="flex flex-wrap max-sm:grid max-sm:grid-cols-4 gap-2">
                                                                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                                                                    const isChecked = values.multi_days.includes(day.toLowerCase());

                                                                    return (
                                                                        <label
                                                                            key={day}
                                                                            className="flex items-center gap-2 text-sm sm:text-base cursor-pointer"
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                // onChange={(e) => {
                                                                                //     const next = new Set(values.multi_days);
                                                                                //     if (e.target.checked) {
                                                                                //         next.add(day.toLowerCase());
                                                                                //     } else {
                                                                                //         next.delete(day.toLowerCase());
                                                                                //     }
                                                                                //     setFieldValue("multi_days", Array.from(next));
                                                                                // }}
                                                                                className="w-4 h-4"
                                                                            />
                                                                            {day}
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>

                                                        </div>


                                                        <div className="grid md:grid-cols-3 grid-cols-1 items-center gap-4">
                                                            <div className="flex gap-2">
                                                                <label className="text-sm font-semibold mb-1 block">Week</label>
                                                                <select
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                                // value={values.week_pattern}
                                                                // onChange={(e) => setFieldValue("week_pattern", e.target.value)}
                                                                >
                                                                    <option value="">Every 1st Days of Week</option>
                                                                    <option value="every">Every Week</option>
                                                                    <option value="alternate">Alternate Weeks</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <label className="text-sm font-semibold mb-1 block">Start At</label>
                                                                <input
                                                                    type="date"
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                                // value={values.multi_start_at || ""}
                                                                // onChange={(e) => setFieldValue("multi_start_at", e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <label className="text-sm font-semibold mb-1 block">End At</label>
                                                                <input
                                                                    type="date"
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                                // value={values.multi_end_at || ""}
                                                                // onChange={(e) => setFieldValue("multi_end_at", e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                                                    <div className="flex w-full items-center gap-2 md:text-center">
                                                        <label className="text-sm font-semibold md:text-center">Pick up Time</label>
                                                        <div className="w-full flex gap-2">
                                                            <select
                                                                className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px]  px-3 py-2 text-sm w-full"
                                                            // value={values.pickup_time_type || ""}
                                                            // onChange={(e) => {
                                                            //     const val = e.target.value;
                                                            //     setFieldValue("pickup_time_type", val);
                                                            //     if (val === "asap") {
                                                            //         setFieldValue("pickup_time", "");
                                                            //     } else if (!values.pickup_time) {
                                                            //         setFieldValue("pickup_time", "00:00");
                                                            //     }
                                                            // }}
                                                            >
                                                                <option value="asap">ASAP</option>
                                                                <option value="time">Pick a time</option>
                                                            </select>
                                                            {/* {values.pickup_time_type === "time" && (
                                                                <input
                                                                    type="time"
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                                    value={values.pickup_time || ""}
                                                                    onChange={(e) => setFieldValue("pickup_time", e.target.value)}
                                                                />
                                                            )} */}
                                                        </div>
                                                    </div>

                                                    <div className="flex w-full items-center gap-2 md:text-center">
                                                        <label className="text-sm font-semibold mb-1">Date</label>
                                                        <input
                                                            type="date"
                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                        // value={values.booking_date || ""}
                                                        // onChange={(e) => setFieldValue("booking_date", e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="flex w-full items-center gap-2 md:text-center">
                                                        <label className="text-sm font-semibold mb-1">Booking Type</label>
                                                        <select
                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 text-sm w-full"
                                                        // value={values.booking_type || ""}
                                                        // onChange={(e) => setFieldValue("booking_type", e.target.value)}
                                                        >
                                                            <option value="local">Local</option>
                                                            <option value="outstation">Outstation</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex  gap-4">
                                                    <div className="flex gap-2 w-full">
                                                        <div className="flex gap-2 items-center relative">
                                                            <span className="text-sm  text-center font-semibold mb-1 w-full">Pick up Point</span>
                                                            <div className="relative">
                                                                <input
                                                                    // ref={(el) => {
                                                                    //     if (mapProvider === "google") {
                                                                    //         pickupInputRef(el);
                                                                    //     } else {
                                                                    //         pickupInputRefValue.current = el;
                                                                    //     }
                                                                    // }}
                                                                    type="text"
                                                                    name="pickup_point"
                                                                    // value={values.pickup_point || ''}
                                                                    // onChange={mapProvider === "barikoi" ? handleBarikoiInputChange : (e) => {
                                                                    //     setFieldValue('pickup_point', e.target.value);
                                                                    //     setPickupAddress(e.target.value);
                                                                    //     invalidateFare();
                                                                    // }}
                                                                    placeholder="Search location..."
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2"
                                                                // onFocus={mapProvider === "barikoi" && values.pickup_point ? () => searchBarikoi(values.pickup_point) : undefined}
                                                                />
                                                                {/* Barikoi Suggestions Dropdown - appears below input like Google Maps */}

                                                            </div>
                                                            <div className="text-center flex items-center gap-2 max-sm:mt-8">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Plot 1"
                                                                    // value={plotData}
                                                                    readOnly
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 bg-gray-50 w-52"
                                                                    // disabled={loadingPlot}
                                                                />
                                                                {/* {loadingPlot && (
                                                                    <span className="text-xs text-gray-500">Loading...</span>
                                                                )} */}
                                                            </div>
                                                        </div>


                                                        <div className="text-center flex items-center max-sm:justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                // onClick={handleAddVia}
                                                                className="px-2 py-2 w-24 border rounded-lg bg-blue-50 text-blue-600  hover:bg-blue-100"
                                                            >
                                                                +Via
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                          

                                                <div className="flex gap-4">
                                                    <div className="flex gap-2">
                                                        <div className="flex items-center gap-2 relative">
                                                            <label className="text-sm font-semibold mb-1 w-20">Destination</label>
                                                            <div className="relative">
                                                                <input
                                                                    // ref={(el) => {
                                                                    //     if (mapProvider === "google") {
                                                                    //         destinationInputRef(el);
                                                                    //     } else {
                                                                    //         destinationInputRefValue.current = el;
                                                                    //     }
                                                                    // }}
                                                                    type="text"
                                                                    name="destination"
                                                                    // value={values.destination || ''}
                                                                    // onChange={mapProvider === "barikoi" ? handleDestinationBarikoiInputChange : (e) => {
                                                                    //     setFieldValue('destination', e.target.value);
                                                                    //     setDestinationAddress(e.target.value);
                                                                    //     invalidateFare();
                                                                    // }}
                                                                    placeholder="Search location..."
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2"
                                                                    autoComplete="off"
                                                                    // onFocus={mapProvider === "barikoi" && values.destination ? () => searchDestinationBarikoi(values.destination) : undefined}
                                                                />
                                                                {/* Barikoi Suggestions Dropdown for Destination */}
                                                            </div>
                                                        </div>

                                                        <div className="text-center flex items-center gap-2 max-sm:mt-8">
                                                            <input
                                                                type="text"
                                                                placeholder="Plot 1"
                                                                value={destinationPlotData}
                                                                readOnly
                                                                className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-52 bg-gray-50"
                                                                disabled={loadingDestinationPlot}
                                                            />
                                                            {/* {loadingDestinationPlot && (
                                                                <span className="text-xs text-gray-500">Loading...</span>
                                                            )} */}
                                                        </div>
                                                    </div>
                                                    <div className="text-center flex items-center max-sm:justify-end gap-2">
                                                        {viaPoints.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={handleSwapDestinationWithLastVia}
                                                                className="px-2 py-2 w-24 border rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                            >
                                                                ⇅ swap
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex md:flex-row flex-col">
                                                    <div className="w-full gap-3 grid">
                                                        <div className="flex md:flex-row flex-col gap-2">
                                                            <div className="text-left flex  gap-2">
                                                                <label className="text-sm font-semibold mb-1 w-20">Name</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Enter Name"
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2"
                                                                    value={values.name || ""}
                                                                    onChange={(e) => setFieldValue("name", e.target.value)}
                                                                />
                                                            </div>

                                                            <div className="text-center flex items-center gap-2 ">
                                                                <label className="text-sm font-semibold mb-1 w-11">Email</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Enter Email"
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2"
                                                                    value={values.email}
                                                                    onChange={(e) => setFieldValue("email", e.target.value)}
                                                                />
                                                            </div>

                                                        </div>

                                                        {/* Mobile / Tel */}
                                                        <div className="flex md:flex-row flex-col gap-2">
                                                            <div className="text-left flex items-left gap-2">
                                                                <label className="text-sm font-semibold mb-1 w-20">Mobile No</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Enter Mobile No"
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2"
                                                                    value={values.phone_no || ""}
                                                                    onChange={(e) => setFieldValue("phone_no", e.target.value)}
                                                                />
                                                            </div>

                                                            <div className="text-center flex items-center gap-2">
                                                                <label className="text-sm font-semibold mb-1">Tel No.</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Enter Telephone no"
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2"
                                                                    value={values.tel_no}
                                                                    onChange={(e) => setFieldValue("tel_no", e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Journey */}
                                                        <div className="w-full">
                                                            <div className="md:flex-row flex-col flex gap-2 w-full">
                                                                <div className="text-left flex items-center gap-2">
                                                                    <label className="text-sm font-semibold w-20">Journey</label>
                                                                    <div className="flex items-center gap-2">
                                                                        <label className="flex items-center gap-1">
                                                                            <input
                                                                                type="radio"
                                                                                name="journey"
                                                                                checked={values.journey_type === "one_way"}
                                                                                onChange={() => setFieldValue("journey_type", "one_way")}
                                                                            />
                                                                            One Way
                                                                        </label>

                                                                        <label className="flex items-center gap-1">
                                                                            <input
                                                                                type="radio"
                                                                                name="journey"
                                                                                checked={values.journey_type === "return"}
                                                                                onChange={() => setFieldValue("journey_type", "return")}
                                                                            />
                                                                            Return
                                                                        </label>

                                                                        <label className="flex items-center gap-1">
                                                                            <input
                                                                                type="radio"
                                                                                name="journey"
                                                                                checked={values.journey_type === "wr"}
                                                                                onChange={() => setFieldValue("journey_type", "wr")}
                                                                            />
                                                                            W/R
                                                                        </label>
                                                                    </div>
                                                                </div>

                                                                <div className="flex-1">
                                                                    <div className="text-center flex items-center gap-2">
                                                                        <label className="text-sm font-semibold mb-1">Accounts</label>
                                                                        <div className="w-full">
                                                                            <select
                                                                                name="account"
                                                                                value={values.account || ""}
                                                                                // onChange={(e) => setFieldValue("account", e.target.value)}
                                                                                className="border-[1.5px] border-[#8D8D8D] rounded-[8px] px-2 py-2 w-full"
                                                                                // disabled={loadingSubCompanies}
                                                                            >
                                                                                <option value="">Select Account</option>

                                                                                {/* {accountList?.map((item) => (
                                                                                    <option key={item.value} value={item.value}>
                                                                                        {item.label}
                                                                                    </option>
                                                                                ))} */}
                                                                            </select>

                                                                        </div>
                                                                        <ErrorMessage
                                                                            name="account"
                                                                            component="div"
                                                                            className="text-red-500 text-sm mt-1"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>



                                                        <div className="flex gap-2 w-full">
                                                            <div className="flex md:flex-row flex-row gap-2 w-full">
                                                                <label className="text-sm font-semibold w-20">Vehicle</label>
                                                                {/* <div className="w-full"> */}
                                                                <select
                                                                    name="vehicle"
                                                                    // value={values.vehicle || ""}
                                                                    // onChange={(e) => {
                                                                    //     setFieldValue("vehicle", e.target.value);
                                                                    //     invalidateFare();
                                                                    // }}
                                                                    // disabled={loadingSubCompanies}
                                                                    className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full bg-gray-50"
                                                                >
                                                                    <option value="">Select Vehicle</option>
                                                                    {/* {vehicleList?.map((item) => (
                                                                        <option key={item.value} value={item.value}>
                                                                            {item.label}
                                                                        </option>
                                                                    ))} */}
                                                                </select>
                                                                <ErrorMessage name="vehicle" component="div" className="text-red-500 text-sm mt-1" />
                                                                {/* </div> */}
                                                            </div>

                                                            <div className="flex md:flex-row flex-row gap-2 w-full">
                                                                <label className="text-sm font-semibold w-20">Driver</label>
                                                                <div className="w-full">
                                                                    <select
                                                                        name="driver"
                                                                        // value={values.driver}
                                                                        // onChange={(e) => setFieldValue("driver", e.target.value)}
                                                                        // disabled={loadingSubCompanies}
                                                                        className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full bg-gray-50"
                                                                    >
                                                                        <option value="">Select Driver</option>
                                                                        {/* {driverList?.map((item) => (
                                                                            <option key={item.value} value={item.value}>
                                                                                {item.label}
                                                                            </option>
                                                                        ))} */}
                                                                    </select>
                                                                    <ErrorMessage name="driver" component="div" className="text-red-500 text-sm mt-1" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                    </div>
                                                    {/* Auto Dispatch + Bidding */}
                                                    <div className="border rounded-lg h-28 md:mt-10 mx-4 px-4 py-4 w-full bg-white shadow-sm">
                                                        <div className="flex flex-col gap-3">
                                                            <label className="flex items-center gap-2">
                                                                <input type="checkbox" defaultChecked />
                                                                Auto Dispatch
                                                            </label>

                                                            <label className="flex items-center gap-2">
                                                                <input type="checkbox" defaultChecked />
                                                                Bidding
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid md:grid-cols-3 grid-cols-1 gap-4">
                                                    <div className="text-center flex items-center gap-2">
                                                        <label className="text-sm font-semibold mb-1 w-20">Passenger</label>
                                                        <input
                                                            type="number"
                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px]  px-3 py-2 w-full"
                                                            // value={values.passenger}
                                                            // onChange={(e) => setFieldValue("passenger", Number(e.target.value) || 0)}
                                                        />
                                                    </div>

                                                    <div className="text-center flex items-center gap-2">
                                                        <label className="text-sm font-semibold mb-1 w-20">Luggage</label>
                                                        <input
                                                            type="number"
                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full"
                                                            // value={values.luggage}
                                                            // onChange={(e) => setFieldValue("luggage", Number(e.target.value) || 0)}
                                                        />
                                                    </div>

                                                    <div className="text-center flex items-center gap-2">
                                                        <label className="text-sm font-semibold mb-1 w-full">
                                                            Hand Luggage
                                                        </label>
                                                        <input
                                                            type="number"
                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px] px-3 py-2 w-full"
                                                            // value={values.hand_luggage}
                                                            // onChange={(e) => setFieldValue("hand_luggage", Number(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid md:grid-cols-2 grid-cols-1 gap-4 ">                                                            <div className="text-center flex items-center gap-2">
                                                    <label className="text-sm font-semibold mb-1 w-28">Special Req</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Write here..."
                                                        className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px]  px-3 py-2 w-full"
                                                        // value={values.special_request}
                                                        // onChange={(e) => setFieldValue("special_request", e.target.value)}
                                                    />
                                                </div>
                                                    <div className="text-center flex items-center gap-2">
                                                        <label className="text-sm font-semibold mb-1 w-28">Payment Ref</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Write here..."
                                                            className="border-[1.5px] shadow-lg border-[#8D8D8D] rounded-[8px]  px-3 py-2 w-full"
                                                            // value={values.payment_reference}
                                                            // onChange={(e) => setFieldValue("payment_reference", e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="w-full h-full rounded-xl overflow-hidden border" style={{ minHeight: '400px' }}>
                                                    <iframe
                                                        title="map"
                                                        width="100%"
                                                        height="100%"
                                                        loading="lazy"
                                                        allowFullScreen
                                                        src={mapUrl}
                                                        style={{ minHeight: '400px' }}
                                                    ></iframe>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-lg space-y-4 mt-7">

                                            <div className="flex justify-between items-center">
                                                <h3 className="font-semibold text-xl">Charges</h3>

                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        className="px-4 py-3 text-xs bg-blue-600 text-white rounded"
                                                        // disabled={isCalculatingFares}
                                                        // onClick={() => handleCalculateFares(values)}
                                                    >
                                                        {isCalculatingFares ? "Calculating..." : "Calculate Fares"}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        className="px-4 py-3 text-xs bg-blue-600 text-white rounded"
                                                    >
                                                        Show Map
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex justify-between">
                                                <div className="flex gap-4 items-center">
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-sm font-medium">Payment Ref</label>
                                                    </div>

                                                    <label className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={values.quoted || false}
                                                            // onChange={(e) =>
                                                            //     setFieldValue("quoted", e.target.checked)
                                                            // }
                                                        />
                                                        Quoted
                                                    </label>

                                                    <select
                                                        value={values.payment_mode}
                                                        // onChange={(e) =>
                                                        //     setFieldValue("payment_mode", e.target.value)
                                                        // }
                                                        className="border rounded px-2 py-1 w-48"
                                                    >
                                                        <option value="cash">Cash</option>
                                                        <option value="card">Card</option>
                                                        <option value="upi">UPI</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <ChargeInput label="Booking Fees Charges" name="booking_fee_charges" values={values} onChange={(v) => updateChargeField("booking_fee_charges", v)} />
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-4 grid-cols-1 gap-4">

                                                <ChargeInput label="Fares" name="fares" values={values} onChange={(v) => updateChargeField("fares", v)} />
                                                <ChargeInput label="Return Fares" name="return_fares" values={values} onChange={(v) => updateChargeField("return_fares", v)} />
                                                <ChargeInput label="Waiting Time" name="waiting_time" values={values} onChange={(v) => setFieldValue("waiting_time", Number(v) || 0)} />
                                                <ChargeInput label="Parking Charges" name="parking_charges" values={values} onChange={(v) => updateChargeField("parking_charges", v)} />

                                                <ChargeInput label="AC Fares" name="ac_fares" values={values} onChange={(v) => updateChargeField("ac_fares", v)} />
                                                <ChargeInput label="Return AC Fares" name="return_ac_fares" values={values} onChange={(v) => updateChargeField("return_ac_fares", v)} />
                                                <ChargeInput label="Waiting Charges" name="waiting_charges" values={values} onChange={(v) => updateChargeField("waiting_charges", v)} />
                                                <ChargeInput label="AC Parking Charges" name="ac_parking_charges" values={values} onChange={(v) => updateChargeField("ac_parking_charges", v)} />

                                                <ChargeInput label="Extra Charges" name="extra_charges" values={values} onChange={(v) => updateChargeField("extra_charges", v)} />
                                                <ChargeInput label="Congestion / Toll" name="congestion_toll" values={values} onChange={(v) => updateChargeField("congestion_toll", v)} />
                                                <ChargeInput label="AC Waiting Charges" name="ac_waiting_charges" values={values} onChange={(v) => updateChargeField("ac_waiting_charges", v)} />
                                                <ChargeInput label="Total Charges" name="total_charges" values={values} readOnly />

                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-end mt-3">
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
                                    // disabled={isLoading || !fareCalculated}
                                >
                                    <span>{isLoading ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update" : "Add")}</span>
                                </Button>
                            </div>
                        </Form>
                    );
                }}
            </Formik>
        </div >
    );
};

export default AddBookingModel;

const ChargeInput = ({ label, name, values, onChange, readOnly = false }) => (
    <div className="flex items-center gap-2">
        <label className="text-sm font-medium w-40">{label}</label>
        <input
            type="number"
            value={values[name] || 0}
            onChange={(e) => onChange && onChange(e.target.value)}
            readOnly={readOnly}
            className=" rounded-[8px] px-5 py-2 w-full"
        />
    </div>
);