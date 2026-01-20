import React, { useEffect, useRef, useState } from "react";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import PageSubTitle from "../../../../components/ui/PageSubTitle/PageSubTitle";
import Button from "../../../../components/ui/Button/Button";
import PlusIcon from "../../../../components/svg/PlusIcon";
import { lockBodyScroll } from "../../../../utils/functions/common.function";
import Modal from "../../../../components/shared/Modal/Modal";
import AddBookingModel from "./components/AddBookingModel";
import MapsConfigurationIcon from "../../../../components/svg/MapsConfigurationIcon";
import OverViewDetails from "./components/OverviewDetails";
import AddBooking from "./components/AddBooking";
import MessageModel from "./components/AddBooking/components/MessageModel";
import { useSocket } from "../../../../components/routes/SocketProvider";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const MARKER_ICONS = {
  online: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
  offline: "https://maps.google.com/mapfiles/ms/icons/grey-dot.png",
  active: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
  pending: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
};

const loadGoogleMaps = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) return resolve();

    const existingScript = document.getElementById("google-maps-script");
    if (existingScript) {
      existingScript.onload = resolve;
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(script);
  });
};

function Stat({ title, value, color }) {
  return (
    <div className="">
      <p className={`text-xs font-bold ${color}`}>{value}</p>
      <p className={`text-xs text-gray-500 ${color}`}>{title}</p>
    </div>
  );
}

const Overview = () => {
  const [isBookingModelOpen, setIsBookingModelOpen] = useState({
    type: "new",
    isOpen: false,
  })
  const [isMessageModelOpen, setIsMessageModelOpen] = useState({
    type: "new",
    isOpen: false,
  });

  const socket = useSocket();

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef({});
  const [driverData, setDriverData] = useState({});

  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then(() => {
        if (!isMounted || !mapRef.current) return;

        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: 23.0225, lng: 72.5714 },
          zoom: 13,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        console.log("Google Maps initialized");
      })
      .catch((err) => console.error("Google Maps load failed:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  const fitMapToMarkers = () => {
    if (!mapInstance.current || Object.keys(markers.current).length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasVisibleMarkers = false;

    Object.values(markers.current).forEach((marker) => {
      if (marker.getVisible()) {
        bounds.extend(marker.getPosition());
        hasVisibleMarkers = true;
      }
    });

    if (hasVisibleMarkers) {
      mapInstance.current.fitBounds(bounds);

      // Prevent zooming in too much for single marker
      const zoom = mapInstance.current.getZoom();
      if (zoom > 15) {
        mapInstance.current.setZoom(15);
      }
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleDriverUpdate = (data) => {
      if (!mapInstance.current) {
        console.warn("Map not initialized yet");
        return;
      }

      console.log("Received driver-location-update:", data);

      let driver_id, latitude, longitude, status, name;

      if (typeof data === 'object' && !Array.isArray(data)) {
        // Your backend sends latitude/longitude swapped, so we need to swap them back
        driver_id = data.driver_id;
        // SWAPPING: Your backend's "latitude" is actually longitude and vice versa
        latitude = data.longitude;  // Backend's longitude is actual latitude
        longitude = data.latitude;  // Backend's latitude is actual longitude
        status = data.status || "online";
        name = data.name || `Driver ${driver_id}`;
      }

      if (!latitude || !longitude) {
        console.warn("❌ Could not extract location from data");
        return;
      }

      // Ensure driver_id exists
      if (!driver_id) {
        driver_id = `driver_${Date.now()}`;
      }

      console.log("✅ Corrected coordinates:", { driver_id, latitude, longitude, status });

      const position = {
        lat: Number(latitude),
        lng: Number(longitude),
      };

      // Store driver data for filtering
      setDriverData((prev) => ({
        ...prev,
        [driver_id]: { ...data, position },
      }));

      // Determine marker icon based on status
      let markerIcon = MARKER_ICONS.online;
      if (status === "offline") markerIcon = MARKER_ICONS.offline;
      else if (status === "active" || status === "on_ride") markerIcon = MARKER_ICONS.active;
      else if (status === "pending") markerIcon = MARKER_ICONS.pending;

      if (markers.current[driver_id]) {
        markers.current[driver_id].setPosition(position);
        markers.current[driver_id].setIcon(markerIcon);
        console.log(`Updated driver ${driver_id} to:`, position);
      } else {
        const marker = new window.google.maps.Marker({
          position,
          map: mapInstance.current,
          title: name || `Driver ${driver_id}`,
          icon: markerIcon,
          animation: window.google.maps.Animation.DROP,
        });

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
              <div style="padding: 8px;">
                <strong>${name || `Driver ${driver_id}`}</strong><br/>
                Status: <span style="text-transform: capitalize;">${status || 'online'}</span><br/>
                Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}
              </div>
            `,
        });

        marker.addListener("click", () => {
          // Close all other info windows
          Object.values(markers.current).forEach((m) => {
            if (m.infoWindow) m.infoWindow.close();
          });
          infoWindow.open(mapInstance.current, marker);
        });

        marker.infoWindow = infoWindow;
        markers.current[driver_id] = marker;
        console.log(`Created marker for driver ${driver_id} at:`, position);
      }

      // Apply filter based on selected status
      updateMarkerVisibility();

      // Auto-fit map to show all markers
      setTimeout(() => fitMapToMarkers(), 100);
    };

    socket.on("driver-location-update", handleDriverUpdate);

    return () => {
      socket.off("driver-location-update", handleDriverUpdate);
    };
  }, [socket]);

  const updateMarkerVisibility = () => {
    Object.entries(markers.current).forEach(([driverId, marker]) => {
      const driver = driverData[driverId];
      if (!driver) return;

      let visible = true;

      marker.setVisible(visible);
    });
  };

  useEffect(() => {
    updateMarkerVisibility();
    setTimeout(() => fitMapToMarkers(), 100);
  }, [ driverData]);

  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 h-full">
      <div className="flex justify-between sm:flex-row flex-col items-start sm:items-center gap-3 sm:gap-0 2xl:mb-6 1.5xl:mb-10 mb-0">
        <div className="sm:mb-[30px] mb-1 sm:w-[calc(100%-240px)] w-full flex gap-5 items-center">          <div className="flex flex-col gap-2.5 w-[calc(100%-100px)]">
          <PageTitle title="Dashboard overview" />
          <PageSubTitle title="Welcome back! (Admin Name), Here's what's happening with your transportation business today." />
        </div>
        </div>
        <div className="flex flex-row gap-3">
          <Button
            className="w-full sm:w-auto px-3 py-1.5 border border-[#ff4747] rounded-full"
          >
            <div className="flex gap-1 items-center justify-center whitespace-nowrap">
              <span className="hidden sm:inline-block">
                <PlusIcon fill={"#ff4747"} height={13} width={13} />
              </span>
              <span className="sm:hidden">
                <PlusIcon height={8} width={8} />
              </span>
              <span className="text-[#252525]">SOS/Job Late</span>
            </div>
          </Button>
          <Button
            className="w-full sm:w-auto px-3 py-1.5 border border-[#1f41bb] rounded-full"
            onClick={() => {
              lockBodyScroll();
              setIsMessageModelOpen({ isOpen: true, type: "new" });
            }}
          >
            <div className="flex gap-1 items-center justify-center whitespace-nowrap">
              <span className="hidden sm:inline-block">
                <PlusIcon fill={"#1f41bb"} height={13} width={13} />
              </span>
              <span className="sm:hidden">
                <PlusIcon height={8} width={8} />
              </span>
              <span>Call Queue</span>
            </div>
          </Button>
          <Button
            className="w-full sm:w-auto px-3 py-1.5 bg-[#F9F9F9] rounded-full"
          >
            <div className="flex gap-1 items-center justify-center whitespace-nowrap">
              <span className="hidden sm:inline-block">
                <PlusIcon fill={"#1f1f1f"} height={13} width={13} />
              </span>
              <span className="sm:hidden">
                <PlusIcon height={8} width={8} />
              </span>
              <span>Log Out</span>
            </div>
          </Button>
          <Button
            className="w-full sm:w-auto px-3 py-1.5 bg-[#AAC0FB] rounded-full"
            onClick={() => {
              lockBodyScroll();
              setIsMessageModelOpen({ isOpen: true, type: "new" });
            }}
          >
            <div className="flex gap-1 items-center justify-center whitespace-nowrap">
              <span className="hidden sm:inline-block">
                <PlusIcon height={13} width={13} />
              </span>
              <span className="sm:hidden">
                <PlusIcon height={8} width={8} />
              </span>
              <span>Message Driver</span>
            </div>
          </Button>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="sm:w-auto xs:w-auto w-full sm:mb-[50px]">
          <Button
            type="filled"
            btnSize="md"
            onClick={() => {
              lockBodyScroll();
              setIsBookingModelOpen({ isOpen: true, type: "new" });
            }}
            className="w-full sm:w-auto -mb-2 sm:-mb-3 lg:-mb-3 !py-3.5 sm:!py-3 lg:!py-3"
          >
            <div className="flex gap-2 sm:gap-[15px] items-center justify-center whitespace-nowrap">
              <span className="hidden sm:inline-block">
                <PlusIcon />
              </span>
              <span className="sm:hidden">
                <PlusIcon height={16} width={16} />
              </span>
              <span>Create Booking</span>
            </div>
          </Button>
        </div>
      </div>

      <div className="">
        <div className="flex flex-row flex-wrap gap-3 h-full">
          <div className="flex-[6] bg-white rounded-2xl bg-[#F4F7FF] shadow p-2 flex flex-col full">
            <div className="flex flex-wrap items-center justify-between mb-3 border-b gap-2 max-sm:flex-col">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1 text-green-600">29 Online</div>
                <div className="flex items-center gap-1 text-gray-500">21 Offline</div>
                <div className="flex items-center gap-1 text-red-500">27 Active Ride</div>
                <div className="flex items-center gap-1 text-yellow-500">2 Ride Pending</div>
              </div>
              <div className="flex gap-2 max-sm:flex-col">
                <Button type="filled" className="px-3 py-2 rounded-md flex justify-center">Plot</Button>
                <Button type="filled" className="px-3 py-2 rounded-md flex justify-center">Map</Button>
              </div>
            </div>

            <div className="flex-1 rounded-xl overflow-hidden">
              <div
                ref={mapRef}
                className="w-full h-full"
              />
            </div>
          </div>

          <div className="flex-[2.2] bg-orange-50 rounded-2xl shadow p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Drivers Waiting</h3>
              <span className="font-semibold">10</span>
            </div>
            <table className="w-full text-xs bg-white rounded-xl">
              <thead className="text-gray-500 ">
                <tr className="">
                  <th className="text-left py-1 text-[11px]">Sr No</th>
                  <th className="text-left text-[11px]">Plot</th>
                  <th className="text-left text-[11px]">Vehicle</th>
                  <th className="text-left text-[11px]">Driver</th>
                  <th className="text-right text-[11px]">Rank</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 9 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1">{i + 1}</td>
                    <td>Elgin St.</td>
                    <td>MPV</td>
                    <td>Driver {i + 1}</td>
                    <td className="text-right">{i * 3 + 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex-[2] bg-green-50 rounded-2xl shadow p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">On Jobs</h3>
            </div>
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr>
                  <th className="text-left py-1">Sr</th>
                  <th className="text-left">Driver</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1">{i + 1}</td>
                    <td>Driver {i + 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex-[1.6] bg-purple-50 rounded-2xl shadow p-3">
            <h3 className="font-semibold mb-2">Messages</h3>
            <div className="space-y-2 text-xs">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white p-2 rounded flex-col flex">
                  <span>Sit amet, consectetur...</span>
                  <div className="flex gap-1 justify-end ">
                    <button className="text-red-500">✕</button>
                    <button className="text-blue-500">↺</button>
                  </div>
                </div>
              ))}
              <button className="text-indigo-600 text-xs mt-2">Clear Messages</button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <OverViewDetails />
      </div>

      {/* <Modal
        isOpen={isBookingModelOpen.isOpen}
        className="p-4 sm:p-6 lg:p-10"
      >
        <AddBookingModel
          // initialValue={isBookingModelOpen.type === "edit" ? isBookingModelOpen.accountData : {}}
          setIsOpen={setIsBookingModelOpen}
        // onSubCompanyCreated={handleOnSubCompanyCreated}
        />
      </Modal> */}
      <Modal
        isOpen={isBookingModelOpen.isOpen}
        className="p-4 sm:p-6 lg:p-10"
      >
        <AddBooking
          // initialValue={isBookingModelOpen.type === "edit" ? isBookingModelOpen.accountData : {}}
          setIsOpen={setIsBookingModelOpen}
        // onSubCompanyCreated={handleOnSubCompanyCreated}
        />
      </Modal>
      <Modal isOpen={isMessageModelOpen.isOpen}>
        <MessageModel
          setIsOpen={setIsMessageModelOpen}
          onClose={() => setIsMessageModelOpen({ isOpen: false })}
          refreshList={() => setRefreshTrigger(prev => prev + 1)}
        />
      </Modal>
      <Modal isOpen={isMessageModelOpen.isOpen}>
        <MessageModel
          setIsOpen={setIsMessageModelOpen}
          onClose={() => setIsMessageModelOpen({ isOpen: false })}
          refreshList={() => setRefreshTrigger(prev => prev + 1)}
        />
      </Modal>
    </div>
  );
};

export default Overview;
