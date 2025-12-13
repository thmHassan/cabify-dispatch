// import { Form, Formik } from "formik";
// import React, { useRef, useState, useEffect } from "react";
// import * as Yup from "yup";
// import _ from "lodash";

// const AddBookingModel = ({ initialValue = {}, setIsOpen, onSubCompanyCreated }) => {
//     const [submitError, setSubmitError] = useState(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const [isEditMode, setIsEditMode] = useState(false);
//     const [subCompanyList, setSubCompanyList] = useState([]);
//     const [loadingSubCompanies, setLoadingSubCompanies] = useState(false);
//     const [googleLoaded, setGoogleLoaded] = useState(false);
//     const setFieldValueRef = useRef(null);
//     const autocompleteInstanceRef = useRef(null);

//     useEffect(() => {
//         setIsEditMode(!!initialValue?.id);
//     }, [initialValue]);

//     // Load Google Maps API with Places library
//     useEffect(() => {
//         const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

//         // Check if script is already loaded
//         if (window.google && window.google.maps && window.google.maps.places) {
//             setGoogleLoaded(true);
//             return;
//         }

//         // Check if script tag already exists
//         const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
//         if (existingScript) {
//             existingScript.addEventListener('load', () => {
//                 setGoogleLoaded(true);
//             });
//             return;
//         }

//         // Create and load script
//         const script = document.createElement('script');
//         script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
//         script.async = true;
//         script.defer = true;
//         script.onload = () => {
//             setGoogleLoaded(true);
//         };
//         script.onerror = () => {
//             console.error('Failed to load Google Maps API');
//         };
//         document.head.appendChild(script);

//         return () => {
//             // Cleanup: Remove script if component unmounts
//             const scriptToRemove = document.querySelector('script[src*="maps.googleapis.com"]');
//             if (scriptToRemove && scriptToRemove === script) {
//                 document.head.removeChild(script);
//             }
//         };
//     }, []);

//     return (
//         <div>
//             <Formik
//                 // initialValues={{
//                 //     name: initialValue?.name || "",
//                 //     email: initialValue?.email || "",
//                 //     pickup_point: initialValue?.pickup_point || "",
//                 // }}
//                 // validationSchema={SUB_COMPANY_VALIDATION_SCHEMA}
//                 // onSubmit={handleSubmit}
//             >
//                 {({ values, setFieldValue }) => {
//                     // Store setFieldValue in ref for use in autocomplete callback
//                     setFieldValueRef.current = setFieldValue;

//                     // Initialize Places Autocomplete using callback ref
//                     const pickupInputRef = (inputElement) => {
//                         if (!inputElement) {
//                             // Cleanup on unmount
//                             if (autocompleteInstanceRef.current) {
//                                 window.google.maps?.event?.clearInstanceListeners(autocompleteInstanceRef.current);
//                                 autocompleteInstanceRef.current = null;
//                             }
//                             return;
//                         }

//                         if (!googleLoaded || autocompleteInstanceRef.current) return;

//                         // Wait a bit for Google to be fully ready
//                         setTimeout(() => {
//                             if (!window.google?.maps?.places) return;

//                             try {
//                                 // Cleanup existing autocomplete if any
//                                 if (autocompleteInstanceRef.current) {
//                                     window.google.maps.event.clearInstanceListeners(autocompleteInstanceRef.current);
//                                 }

//                                 // Initialize Autocomplete
//                                 const autocomplete = new window.google.maps.places.Autocomplete(
//                                     inputElement,
//                                     {
//                                         types: ['address', 'establishment'],
//                                         componentRestrictions: { country: [] }, // Remove country restriction for global search
//                                         fields: ['formatted_address', 'geometry', 'name', 'place_id']
//                                     }
//                                 );

//                                 autocompleteInstanceRef.current = autocomplete;

//                                 // Handle place selection
//                                 autocomplete.addListener('place_changed', () => {
//                                     const place = autocomplete.getPlace();
//                                     if (place && place.formatted_address && setFieldValueRef.current) {
//                                         // Update Formik field value
//                                         setFieldValueRef.current('pickup_point', place.formatted_address);

//                                         // You can access place details here:
//                                         // place.geometry.location.lat() - latitude
//                                         // place.geometry.location.lng() - longitude
//                                         // place.formatted_address - full address
//                                         // place.name - place name
//                                         console.log('Selected place:', place);
//                                     }
//                                 });
//                             } catch (error) {
//                                 console.error('Error initializing Google Places Autocomplete:', error);
//                             }
//                         }, 100);
//                     };

//                     return (
//                         <Form>
//                             <div className="w-full">
//                                 <div className="space-y-4 w-full">
//                                     <div class="w- flex items-center gap-4">
//                                         <h2 className="text-x font-semibold">Create New Booking</h2>
//                                         {/* <div className="flex flex-row gap-4 items-center">
//                                             <FormLabel htmlFor="sub_company">Sub Company</FormLabel>
//                                             <div className="h-16 w-80">
//                                                 <FormSelection
//                                                     label="Select Sub Company"
//                                                     name="sub_company"
//                                                     value={values.sub_company}
//                                                     onChange={(val) => setFieldValue("sub_company", val)}
//                                                     placeholder="Select Sub Company"
//                                                     options={subCompanyList}
//                                                     disabled={loadingSubCompanies}
//                                                 />
//                                             </div>
//                                             <ErrorMessage
//                                                 name="sub_company"
//                                                 component="div"
//                                                 className="text-red-500 text-sm mt-1"
//                                             />
//                                         </div> */}
//                                         <div class="flex items-center border border-gray-300 rounded-md px-2 py-2">
//                                             <span class="text-sm mr-2">Single Booking</span>

//                                             <label class="relative inline-flex items-center cursor-pointer">
//                                                 <input type="checkbox" class="sr-only peer" />
//                                                 <div class="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-green-400 transition-all"></div>
//                                                 <div
//                                                     class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-all">
//                                                 </div>
//                                             </label>

//                                             <span className="text-sm ml-2">Multi Booking</span>
//                                         </div>

//                                     </div>


//                                     {/* Form + Map */}
//                                     <div className="w-full bg-white">
//                                         <div className="grid grid-cols-1 lg:grid-cols-3  gap-4">

//                                             {/* ------------------ LEFT SIDE FORM ------------------ */}
//                                             <div className="lg:col-span-2 space-y-4">

//                                                 {/* Pick up time / Date / Booking Type */}
//                                                 <div className="grid grid-cols-3 gap-3">
//                                                     <div className="flex items-center gap-2 text-center">
//                                                         <label className="text-sm font-semibold text-center">Pick up Time</label>
//                                                         <select className="border rounded-lg px-3 py-2 text-sm">
//                                                             <option>ASAP</option>
//                                                         </select>
//                                                     </div>

//                                                     <div className="flex items-center text-center gap-2">
//                                                         <label className="text-sm font-semibold mb-1">Date</label>
//                                                         <input
//                                                             type="date"
//                                                             className="border rounded-lg px-3 py-2 text-sm"
//                                                         />
//                                                     </div>

//                                                     <div className="flex items-center gap-2 text-center">
//                                                         <label className="text-sm font-semibold mb-1">Booking Type</label>
//                                                         <select className="border rounded-lg px-3 py-2 text-sm">
//                                                             <option>Local</option>
//                                                         </select>
//                                                     </div>
//                                                 </div>

//                                                 {/* Pickup row */}
//                                                 <div className="flex gap-4 w-full">
//                                                     <div className="text-center flex items-center gap-2">
//                                                         <label className="text-sm font-semibold mb-1">PickupPoint</label>
//                                                         <input
//                                                             ref={pickupInputRef}
//                                                             type="text"
//                                                             name="pickup_point"
//                                                             value={values.pickup_point || ''}
//                                                             onChange={(e) => setFieldValue('pickup_point', e.target.value)}
//                                                             placeholder="Search location..."
//                                                             className="border rounded-lg px-3 py-2 w-full"
//                                                             autoComplete="off"
//                                                         />
//                                                     </div>

//                                                     <div className="text-center flex items-center gap-2">
//                                                         <input
//                                                             type="text"
//                                                             placeholder="Plot 1"
//                                                             className="border rounded-lg px-3 py-2 w-full"
//                                                         />
//                                                     </div>

//                                                     <div className="text-center flex items-center gap-2">
//                                                         <button className="px-2 py-2 w-24 border rounded-lg bg-blue-50 text-blue-600  hover:bg-blue-100">
//                                                             +Via
//                                                         </button>
//                                                     </div>

//                                                 </div>


//                                                 <div className="flex gap-4">
//                                                     <div className="col-span-1 text-center flex items-center gap-2">
//                                                         <label className="text-sm font-semibold mb-1">Destination</label>
//                                                         <input
//                                                             type="text"
//                                                             placeholder="Enter Pickup Point"
//                                                             className="border rounded-lg px-3 py-2 w-full"
//                                                         />
//                                                     </div>

//                                                     <div className="text-center flex items-center gap-2">
//                                                         <input
//                                                             type="text"
//                                                             placeholder="Plot 1"
//                                                             className="border rounded-lg px-3 py-2 w-full"
//                                                         />
//                                                     </div>

//                                                     <div className="text-center flex items-center gap-2">
//                                                         <button className="px-2 py-2 w-24 border rounded-lg bg-blue-50 text-blue-600  hover:bg-blue-100">
//                                                             ⇅ swap
//                                                         </button>
//                                                     </div>
//                                                 </div>
//                                                 <div className="flex flex-row  gap-4">
//                                                     <div className="w-full gap-3 grid">

//                                                         {/* Name / Email */}
//                                                         <div className="flex gap-4">
//                                                             <div className="text-center flex items-center gap-2">
//                                                                 <label className="text-sm font-semibold mb-1">Name</label>
//                                                                 <input
//                                                                     type="text"
//                                                                     placeholder="Enter Name"
//                                                                     className="border rounded-lg px-3 py-2 w-full"
//                                                                 />
//                                                             </div>

//                                                             <div className="text-center flex items-center gap-2">
//                                                                 <label className="text-sm font-semibold mb-1">Email</label>
//                                                                 <input
//                                                                     type="text"
//                                                                     placeholder="Enter Email"
//                                                                     className="border rounded-lg px-3 py-2 w-full"
//                                                                 />
//                                                             </div>

//                                                         </div>

//                                                         {/* Mobile / Tel */}
//                                                         <div className="flex gap-4">
//                                                             <div className="text-center flex items-center gap-2">
//                                                                 <label className="text-sm font-semibold mb-1">Mobile No</label>
//                                                                 <input
//                                                                     type="text"
//                                                                     placeholder="Enter Mobile No"
//                                                                     className="border rounded-lg px-3 py-2 w-full"
//                                                                 />
//                                                             </div>

//                                                             <div className="text-center flex items-center gap-2">
//                                                                 <label className="text-sm font-semibold mb-1">Tel No.</label>
//                                                                 <input
//                                                                     type="text"
//                                                                     placeholder="Enter Email"
//                                                                     className="border rounded-lg px-3 py-2 w-full"
//                                                                 />
//                                                             </div>
//                                                         </div>

//                                                         {/* Journey */}
//                                                         <div className="w-full">
//                                                             <div className="text-center flex items-center gap-2">
//                                                                 <label className="text-sm font-semibold">Journey</label>
//                                                                 <div className="flex items-center gap-2">
//                                                                     <label className="flex items-center gap-1">
//                                                                         <input type="radio" name="journey" defaultChecked />
//                                                                         One Way
//                                                                     </label>

//                                                                     <label className="flex items-center gap-1">
//                                                                         <input type="radio" name="journey" />
//                                                                         Return
//                                                                     </label>

//                                                                     <label className="flex items-center gap-1">
//                                                                         <input type="radio" name="journey" />
//                                                                         W/R

//                                                                     </label>
//                                                                     {/* Accounts */}
//                                                                     <div className="flex gap-4">
//                                                                         <div className="text-center flex items-center gap-2">
//                                                                             <label className="text-sm font-semibold mb-1">Accounts</label>
//                                                                             <select className="border rounded-lg px-3 py-2 w-full">
//                                                                                 <option>Select Account</option>
//                                                                             </select>
//                                                                         </div>


//                                                                     </div>

//                                                                 </div>
//                                                             </div>
//                                                         </div>

//                                                         {/* Driver */}
//                                                         <div className="grid grid-cols-2 gap-3">
//                                                             <div className="text-center flex items-center gap-2">
//                                                                 <label className="text-sm font-semibold mb-1">vehicle</label>
//                                                                 <select className="border rounded-lg px-3 py-2 w-full">
//                                                                     <option>Select vehicle</option>
//                                                                 </select>
//                                                             </div>
//                                                             <div className="text-center flex items-center gap-2">
//                                                                 <label className="text-sm font-semibold mb-1">Driver</label>
//                                                                 <select className="border rounded-lg px-3 py-2 w-full">
//                                                                     <option>Select Driver</option>
//                                                                 </select>
//                                                             </div>
//                                                         </div>

//                                                         {/* Passenger / Luggage */}
//                                                         <div className="flex gap-4">
//                                                             <div className="text-center flex items-center gap-2">
//                                                                 <label className="text-sm font-semibold mb-1">Passenger</label>
//                                                                 <input
//                                                                     type="number"
//                                                                     className="border rounded-lg px-3 py-2 w-full"
//                                                                     defaultValue="0"
//                                                                 />
//                                                             </div>

//                                                             <div className="text-center flex items-center gap-2">
//                                                                 <label className="text-sm font-semibold mb-1">Luggage</label>
//                                                                 <input
//                                                                     type="number"
//                                                                     className="border rounded-lg px-3 py-2 w-full"
//                                                                     defaultValue="0"
//                                                                 />
//                                                             </div>

//                                                             <div className="text-center flex items-center gap-2">
//                                                                 <label className="text-sm font-semibold mb-1">
//                                                                     Hand Luggage
//                                                                 </label>
//                                                                 <input
//                                                                     type="number"
//                                                                     className="border rounded-lg px-3 py-2 w-full"
//                                                                     defaultValue="0"
//                                                                 />
//                                                             </div>
//                                                         </div>

//                                                         {/* Special Req */}
//                                                         <div className="flex gap-4">
//                                                             <div className="text-center flex items-center gap-2">
//                                                                 <label className="text-sm font-semibold mb-1">Special Req</label>
//                                                                 <input
//                                                                     type="text"
//                                                                     placeholder="Write here..."
//                                                                     className="border rounded-lg px-3 py-2 w-full"
//                                                                 />
//                                                             </div>

//                                                             {/* Payment Ref */}
//                                                             <div className="text-center flex items-center gap-2">
//                                                                 <label className="text-sm font-semibold mb-1">Payment Ref</label>
//                                                                 <input
//                                                                     type="text"
//                                                                     placeholder="Write here..."
//                                                                     className="border rounded-lg px-3 py-2 w-full"
//                                                                 />
//                                                             </div>
//                                                         </div>
//                                                     </div>
//                                                     {/* Auto Dispatch + Bidding */}
//                                                     <div className="border rounded-lg  h-24 mt-20 px-4 py-4 w-52 bg-white shadow-sm">
//                                                         <div className="flex flex-col gap-3">
//                                                             <label className="flex items-center gap-2">
//                                                                 <input type="checkbox" defaultChecked />
//                                                                 Auto Dispatch
//                                                             </label>

//                                                             <label className="flex items-center gap-2">
//                                                                 <input type="checkbox" defaultChecked />
//                                                                 Bidding
//                                                             </label>
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             </div>

//                                             {/* ------------------ RIGHT SIDE MAP ------------------ */}
//                                             <div>
//                                                 <div className="w-full h-full rounded-xl overflow-hidden border">
//                                                     <iframe
//                                                         title="map"
//                                                         width="100%"
//                                                         height="100%"
//                                                         loading="lazy"
//                                                         allowFullScreen
//                                                         src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2371.276..."
//                                                     ></iframe>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                         <div class="w-full bg-[#e9f1ff] p-4 rounded-xl mt-4">
//                                             <h2 class="text-2xl font-semibold mb-6">Charges</h2>

//                                             {/* <!-- Top Row --> */}
//                                             <div class="flex items-center gap-6 mb-6">
//                                                 <div class="flex items-cente gap-2">
//                                                     <span class="font-medium">Payment Ref</span>
//                                                     <input type="checkbox" class="w-4 h-4 rounded border-gray-300 checked:bg-blue-600" />
//                                                     <span class="font-medium">Quoted</span>
//                                                 </div>

//                                                 {/* <!-- Select --> */}
//                                                 <select
//                                                     class="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
//                                                     <option>Cash</option>
//                                                     <option>Card</option>
//                                                     <option>Online</option>
//                                                 </select>
//                                             </div>

//                                             {/* <!-- Grid Layout --> */}
//                                             <div class="grid grid-cols-4 gap-x-10 gap-y-6">

//                                                 {/* <!-- Column 1 --> */}
//                                                 <div>
//                                                     <label class="block mb-1 font-medium">Fares</label>
//                                                     <input class="w-24 px-3 py-2 bg-white border border-gray-300 rounded-md" value="0" />

//                                                     <label class="block mt-4 mb-1 font-medium">AC Fares</label>
//                                                     <input class="w-24 px-3 py-2 bg-white border border-gray-300 rounded-md" value="0" />

//                                                     <label class="block mt-4 mb-1 font-medium">Extra Charges</label>
//                                                     <input class="w-24 px-3 py-2 bg-white border border-gray-300 rounded-md" value="0" />
//                                                 </div>

//                                                 {/* <!-- Column 2 --> */}
//                                                 <div>
//                                                     <label class="block mb-1 font-medium">Return Fares</label>
//                                                     <input class="w-24 px-3 py-2 bg-white border border-gray-300 rounded-md" value="0" />

//                                                     <label class="block mt-4 mb-1 font-medium">Return AC Fares</label>
//                                                     <input class="w-24 px-3 py-2 bg-white border border-gray-300 rounded-md" value="0" />

//                                                     <label class="block mt-4 mb-1 font-medium">Congestion/Toll</label>
//                                                     <input class="w-24 px-3 py-2 bg-white border border-gray-300 rounded-md" value="0" />
//                                                 </div>

//                                                 {/* <!-- Column 3 --> */}
//                                                 <div>
//                                                     <label class="block mb-1 font-medium">Parking Charges</label>
//                                                     <input class="w-24 px-3 py-2 bg-white border border-gray-300 rounded-md" value="0" />

//                                                     <label class="block mt-4 mb-1 font-medium">AC Parking Charges</label>
//                                                     <input class="w-24 px-3 py-2 bg-white border border-gray-300 rounded-md" value="0" />

//                                                     <label class="block mt-4 mb-1 font-medium">Total Charges</label>
//                                                     <input class="w-24 px-3 py-2 bg-white border border-gray-300 rounded-md" value="0" />
//                                                 </div>

//                                                 {/* <!-- Column 4 --> */}
//                                                 <div>
//                                                     <label class="block mb-1 font-medium">Booking Fees Charges</label>
//                                                     <input class="w-24 px-3 py-2 bg-white border border-gray-300 rounded-md" value="0" />

//                                                     <label class="block mt-4 mb-1 font-medium">Waiting Charges</label>
//                                                     <input class="w-24 px-3 py-2 bg-white border border-gray-300 rounded-md" value="0" />

//                                                     <label class="block mt-4 mb-1 font-medium">AC Waiting Charges</label>
//                                                     <input class="w-24 px-3 py-2 bg-white border border-gray-300 rounded-md" value="0" />

//                                                     <label class="block mt-4 mb-1 font-medium">Waiting Time</label>
//                                                     <input class="w-24 px-3 py-2 bg-white border border-gray-300 rounded-md" value="0" />
//                                                 </div>

//                                             </div>

//                                             {/* <!-- Buttons --> */}
//                                             <div class="flex justify-end gap-4 mt-8">
//                                                 <button class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
//                                                     Calculate Fares
//                                                 </button>
//                                                 <button class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
//                                                     Show Map
//                                                 </button>
//                                             </div>
//                                         </div>

//                                     </div>
//                                 </div>
//                             </div>
//                         </Form>
//                     );
//                 }}
//             </Formik>
//         </div>
//     );
// };

// export default AddBookingModel;


const AddBookingModel = () => {
    return (
        <>
        <div>AddBookingModel</div>
        </>
    )
}

export default AddBookingModel