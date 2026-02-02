import React, { useEffect, useRef, useState } from "react";
import PageTitle from "../../../../components/ui/PageTitle/PageTitle";
import PageSubTitle from "../../../../components/ui/PageSubTitle/PageSubTitle";
import Button from "../../../../components/ui/Button/Button";
import PlusIcon from "../../../../components/svg/PlusIcon";
import { lockBodyScroll } from "../../../../utils/functions/common.function";
import Modal from "../../../../components/shared/Modal/Modal";
import OverViewDetails from "./components/OverviewDetails";
import AddBooking from "./components/AddBooking";
import MessageModel from "./components/MessageModel";
import { useSocket } from "../../../../components/routes/SocketProvider";
import TodayBookingIcon from "../../../../components/svg/TodayBookingIcon";
import PreBookingIcon from "../../../../components/svg/PreBookingIcon";
import NoShowIcon from "../../../../components/svg/NoShowIcon";
import CancelledIcon from "../../../../components/svg/CancelledIcon";
import AdvanceSearchIcon from "../../../../components/svg/AdvanceSearchIcon";
import { useAppSelector } from "../../../../store";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const MARKER_ICONS = {
  idle: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  busy: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
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

const animateMarker = (marker, newPosition, duration = 1000) => {
  const startPosition = marker.getPosition();
  const startLat = startPosition.lat();
  const startLng = startPosition.lng();
  const endLat = newPosition.lat;
  const endLng = newPosition.lng;

  const startTime = Date.now();

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function for smooth animation (ease-in-out)
    const easeProgress = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const currentLat = startLat + (endLat - startLat) * easeProgress;
    const currentLng = startLng + (endLng - startLng) * easeProgress;

    marker.setPosition({ lat: currentLat, lng: currentLng });

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  animate();
};

const Overview = () => {
  const [isBookingModelOpen, setIsBookingModelOpen] = useState({
    type: "new",
    isOpen: false,
  });
  const [isMessageModelOpen, setIsMessageModelOpen] = useState({
    type: "new",
    isOpen: false,
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const tabs = [
    { id: "today", label: "TODAY'S BOOKING", count: 0, icon: TodayBookingIcon, color: "bg-[#1F41BB]" },
    { id: "pre", label: "PRE BOOKINGS", count: 1, icon: PreBookingIcon, color: "bg-blue-500" },
    { id: "recent", label: "RECENT JOBS", count: 0, icon: TodayBookingIcon, color: "bg-blue-500" },
    { id: "completed", label: "COMPLETED", count: 0, icon: TodayBookingIcon, color: "bg-blue-500" },
    { id: "noshow", label: "NO SHOW", count: 0, icon: NoShowIcon, color: "bg-blue-500" },
    { id: "cancelled", label: "CANCELLED", count: 0, icon: CancelledIcon, color: "bg-blue-500" },
    { id: "advance", label: "ADVANCE SEARCH", icon: AdvanceSearchIcon, color: "bg-blue-500" },
  ];

  const socket = useSocket();

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef({});
  const [driverData, setDriverData] = useState({});

  const [waitingDrivers, setWaitingDrivers] = useState([]);
  const [onJobDrivers, setOnJobDrivers] = useState([]);

  // Calculate driver counts by status
  const driverCounts = React.useMemo(() => {
    const counts = {
      busy: 0,
      idle: 0,
      total: 0
    };

    Object.values(driverData).forEach((driver) => {
      counts.total++;
      if (driver.status === 'busy') {
        counts.busy++;
      } else if (driver.status === 'idle') {
        counts.idle++;
      }
    });

    return counts;
  }, [driverData]);

  const user = useAppSelector((state) => state.auth.user);

  const displayName =
    user?.name
      ? user.name.charAt(0).toUpperCase() + user.name.slice(1)
      : "Admin";

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

    const handleDriverUpdate = (rawData) => {
      if (!mapInstance.current) {
        console.warn("Map not initialized yet");
        return;
      }

      console.log("Received driver-location-update:", rawData);

      // Parse JSON string if needed
      let data;
      try {
        if (typeof rawData === 'string') {
          data = JSON.parse(rawData);
          console.log("✅ Parsed JSON data:", data);
        } else {
          data = rawData;
        }
      } catch (error) {
        console.error("❌ Failed to parse JSON:", error);
        return;
      }

      // Log the full data structure to debug
      console.log("Full data object:", JSON.stringify(data, null, 2));

      // Extract driver ID from the new data structure
      const driverId = data?.id;
      const latitude = data?.latitude;
      const longitude = data?.longitude;
      const drivingStatus = data?.driving_status; // This should be "busy" or "idle"
      const name = data?.name || `Driver ${driverId}`;
      const phoneNo = data?.phone_no || "";
      const vehiclePlateNo = data?.plate_no || "";

      console.log("Extracted values:", {
        driverId,
        latitude,
        longitude,
        drivingStatus,
        name,
        rawDrivingStatus: data?.driving_status,
        allKeys: Object.keys(data || {})
      });

      // Validate that we have the required data
      if (!driverId && driverId !== 0) {
        console.warn("❌ No driver ID found in data");
        return;
      }

      if (!latitude || !longitude) {
        console.warn("❌ Could not extract location from data");
        return;
      }

      // If driving_status is not present or not valid, use a default
      const validStatus = (drivingStatus === 'busy' || drivingStatus === 'idle')
        ? drivingStatus
        : 'idle'; // default to idle if status is missing or invalid

      if (!drivingStatus) {
        console.warn("⚠️ No driving_status found in data, using default 'idle'");
      } else if (drivingStatus !== 'busy' && drivingStatus !== 'idle') {
        console.warn(`⚠️ Invalid driving_status '${drivingStatus}', using default 'idle'`);
      }

      console.log("✅ Processing driver:", { driverId, latitude, longitude, drivingStatus: validStatus });

      const position = {
        lat: Number(latitude),
        lng: Number(longitude),
      };

      // Store driver data for filtering
      setDriverData((prev) => ({
        ...prev,
        [driverId]: { ...data, position, name, status: validStatus },
      }));

      // Determine marker icon based on driving_status
      const markerIcon = MARKER_ICONS[validStatus] || MARKER_ICONS.idle;

      if (markers.current[driverId]) {
        // Update existing marker with smooth animation
        const marker = markers.current[driverId];
        const oldPosition = marker.getPosition();
        const oldLat = oldPosition.lat();
        const oldLng = oldPosition.lng();

        // Calculate distance between old and new position
        const latDiff = Math.abs(oldLat - position.lat);
        const lngDiff = Math.abs(oldLng - position.lng);
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

        // Only animate if distance is small (to avoid long animations across the map)
        // 0.01 degrees is roughly 1 km
        if (distance < 0.01) {
          animateMarker(marker, position, 1000); // 1 second smooth animation
        } else {
          // For large jumps, just set position directly
          marker.setPosition(position);
        }

        marker.setIcon(markerIcon);

        // Update info window content
        if (marker.infoWindow) {
          marker.infoWindow.setContent(`
            <div style="padding: 5px;">
              <strong>${name}</strong><br/>
              Phone: ${phoneNo}<br/>
              Vehicle: ${vehiclePlateNo}<br/>
            </div>
          `);
        }

        console.log(`✅ Animated driver ${driverId} to:`, position);
      } else {
        // Create new marker
        const marker = new window.google.maps.Marker({
          position,
          map: mapInstance.current,
          title: name,
          icon: markerIcon,
          animation: window.google.maps.Animation.DROP,
        });

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 5px;">
              <strong>${name}</strong><br/>
              Phone: ${phoneNo}<br/>
              Vehicle: ${vehiclePlateNo}<br/>
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
        markers.current[driverId] = marker;
        console.log(`✅ Created marker for driver ${driverId} at:`, position);
      }

      // Apply filter based on selected status
      updateMarkerVisibility();

      // Auto-fit map to show all markers (only on first marker)
      if (Object.keys(markers.current).length <= 1) {
        setTimeout(() => fitMapToMarkers(), 100);
      }
    };

    socket.on("driver-location-update", handleDriverUpdate);

    return () => {
      socket.off("driver-location-update", handleDriverUpdate);
    };
  }, [socket,]);

  const updateMarkerVisibility = () => {
    Object.entries(markers.current).forEach(([driverId, marker]) => {
      const driver = driverData[driverId];
      if (!driver) return;

      let visible = true;

      marker.setVisible(visible);
    });
  };

  useEffect(() => {
    if (!socket) return;

    const handleWaitingDrivers = (rawData) => {
      console.log("Received waiting-driver-event:", rawData);
      console.log("Type of rawData:", typeof rawData);
      console.log("Raw data structure:", JSON.stringify(rawData, null, 2));

      let data;
      try {
        // First try to parse if it's a JSON string
        if (typeof rawData === 'string') {
          try {
            data = JSON.parse(rawData);
            console.log("✅ Parsed JSON string:", data);
          } catch (parseError) {
            // If parsing fails, it might be just a simple string
            console.log("⚠️ String is not JSON, treating as single value:", rawData);
            data = rawData;
          }
        } else {
          data = rawData;
        }
      } catch (error) {
        console.error("❌ Failed to process waiting drivers data:", error);
        return;
      }

      console.log("✅ Processed waiting drivers data:", data);

      // Handle different data structures
      if (Array.isArray(data)) {
        // Array of drivers
        setWaitingDrivers(data);
      } else if (data?.drivers && Array.isArray(data.drivers)) {
        // Object with drivers array
        setWaitingDrivers(data.drivers);
      } else if (data?.data && Array.isArray(data.data)) {
        // Object with data array
        setWaitingDrivers(data.data);
      } else if (data?.driverName || data?.driver_name) {
        // Single driver object with driverName or driver_name field
        console.log("✅ Received single driver object with driverName/driver_name");
        const driverObj = {
          id: Date.now(),
          name: data.driverName || data.driver_name,
          plot: data.plot || data.plot_id || data.plot_name || 'N/A',
          vehicle: data.vehicle || data.vehicle_type || data.vehicle_name || 'N/A',
          rank: data.rank || data.ranking || 1,
          ...data // Include all other fields
        };
        // Add to existing array instead of replacing
        setWaitingDrivers((prev) => {
          // Check if driver already exists
          const exists = prev.some(d =>
            (d.name === driverObj.name && d.plot === driverObj.plot) ||
            (d.id === driverObj.id)
          );
          if (exists) {
            // Update existing driver
            return prev.map(d =>
              (d.name === driverObj.name && d.plot === driverObj.plot)
                ? driverObj
                : d
            );
          }
          // Add new driver
          return [...prev, driverObj];
        });
      } else if (typeof data === 'string') {
        // If it's just a string, create a simple object
        console.log("⚠️ Received simple string, creating basic driver object");
        const driverObj = { name: data, id: Date.now(), plot: 'N/A', vehicle: 'N/A', rank: 1 };
        setWaitingDrivers((prev) => [...prev, driverObj]);
      } else if (typeof data === 'object' && data !== null) {
        // If it's a single object without driverName, wrap it in an array
        console.log("⚠️ Received single object, wrapping in array");
        setWaitingDrivers([{ ...data, id: data.id || Date.now() }]);
      } else {
        console.warn("⚠️ Unknown data structure for waiting drivers:", data);
        setWaitingDrivers([]);
      }
    };

    socket.on("waiting-driver-event", handleWaitingDrivers);

    return () => {
      socket.off("waiting-driver-event", handleWaitingDrivers);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleOnJobDrivers = (rawData) => {
      console.log("Received on-job-driver-event:", rawData);
      console.log("Type of rawData:", typeof rawData);
      console.log("Raw data structure:", JSON.stringify(rawData, null, 2));

      let data;
      try {
        // First try to parse if it's a JSON string
        if (typeof rawData === 'string') {
          try {
            data = JSON.parse(rawData);
            console.log("✅ Parsed JSON string:", data);
          } catch (parseError) {
            // If parsing fails, it might be just a simple string (like "Jatin")
            console.log("⚠️ String is not JSON, treating as single value:", rawData);
            data = rawData;
          }
        } else {
          data = rawData;
        }
      } catch (error) {
        console.error("❌ Failed to process on-job drivers data:", error);
        return;
      }

      console.log("✅ Processed on-job drivers data:", data);

      // Handle different data structures
      if (Array.isArray(data)) {
        // Array of drivers
        setOnJobDrivers(data);
      } else if (data?.drivers && Array.isArray(data.drivers)) {
        // Object with drivers array
        setOnJobDrivers(data.drivers);
      } else if (data?.data && Array.isArray(data.data)) {
        // Object with data array
        setOnJobDrivers(data.data);
      } else if (data?.driverName || data?.driver_name) {
        // Single driver object with driverName or driver_name field
        console.log("✅ Received single driver object with driverName/driver_name");
        const driverObj = {
          id: Date.now(),
          name: data.driverName || data.driver_name,
          job_id: data.job_id || data.booking_id || data.ride_id || 'N/A',
          plot: data.plot || data.plot_id || data.plot_name,
          ...data // Include all other fields
        };
        // Add to existing array instead of replacing
        setOnJobDrivers((prev) => {
          // Check if driver already exists
          const exists = prev.some(d =>
            (d.name === driverObj.name && d.job_id === driverObj.job_id) ||
            (d.id === driverObj.id)
          );
          if (exists) {
            // Update existing driver
            return prev.map(d =>
              (d.name === driverObj.name)
                ? driverObj
                : d
            );
          }
          // Add new driver
          return [...prev, driverObj];
        });
      } else if (typeof data === 'string') {
        // If it's just a string (like "Jatin"), create a simple object
        console.log("⚠️ Received simple string, creating basic driver object");
        const driverObj = { name: data, id: Date.now(), job_id: 'N/A' };
        setOnJobDrivers((prev) => [...prev, driverObj]);
      } else if (typeof data === 'object' && data !== null) {
        // If it's a single object without driverName, wrap it in an array
        console.log("⚠️ Received single object, wrapping in array");
        setOnJobDrivers([{ ...data, id: data.id || Date.now() }]);
      } else {
        console.warn("⚠️ Unknown data structure for on-job drivers:", data);
        setOnJobDrivers([]);
      }
    };

    socket.on("on-job-driver-event", handleOnJobDrivers);

    return () => {
      socket.off("on-job-driver-event", handleOnJobDrivers);
    };
  }, [socket]);

  useEffect(() => {
    updateMarkerVisibility();
    setTimeout(() => fitMapToMarkers(), 100);
  }, [driverData]);

  return (
    <div className="h-full">
      <div className="px-5 pt-5 flex justify-between sm:flex-row flex-col items-start sm:items-center gap-3 sm:gap-0 2xl:mb-6 1.5xl:mb-10 mb-0">
        <div className="sm:mb-[30px] mb-1 sm:w-[calc(100%-240px)] w-full flex gap-5 items-center">          <div className="flex flex-col gap-2.5 w-[calc(100%-100px)]">
          <PageTitle title="Dashboard overview" />
          <PageSubTitle
            title={`Welcome back! ${displayName}, Here's what's happening with your transportation business today.`}
          />
        </div>
        </div>
        <div className="flex flex-row gap-3">
          {/* <Button
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
          </Button> */}
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
          {/* <Button
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
          </Button> */}
          {/* <Button
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
          </Button> */}
        </div>
      </div>
      <div className="px-5 flex justify-end">
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

      <div className="px-5 pt-5 h-[500px]">
        <div className="flex flex-col md:flex-row gap-4 h-full">
          <div className="w-full lg:w-[55%] bg-[#F4F7FF] h-full rounded-2xl shadow p-2 flex flex-col">
            <div className="flex flex-wrap items-center justify-between mb-3 border-b gap-2 max-sm:flex-col">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1 text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-600"></span>
                  {driverCounts.busy} Online (Active)
                </div>
                <div className="flex items-center gap-1 text-red-500">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  {driverCounts.idle} Offline (Inactive)
                </div>
              </div>
              {/* <div className="flex gap-2 max-sm:flex-col">
                <Button type="filled" className="px-3 py-2 rounded-md flex justify-center">Plot</Button>
                <Button type="filled" className="px-3 py-2 rounded-md flex justify-center">Map</Button>
              </div> */}
            </div>

            <div className="flex-1 rounded-xl overflow-hidden">
              <div
                ref={mapRef}
                className="w-full h-full"
              />
            </div>
          </div>

          <div className="w-full lg:w-[20.5%] bg-orange-50 rounded-2xl shadow p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Drivers Waiting</h3>
              <span className="font-semibold">{waitingDrivers.length}</span>
            </div>
            <table className="w-full text-xs  rounded-xl">
              <thead className="text-gray-500 ">
                <tr className="">
                  <th className="text-left py-1 text-[11px]">Sr No</th>
                  <th className="text-left text-[11px]">Plot</th>
                  {/* <th className="text-left text-[11px]">Vehicle</th> */}
                  <th className="text-left text-[11px]">Driver</th>
                  <th className="text-right text-[11px]">Rank</th>
                </tr>
              </thead>
              <tbody>
                {waitingDrivers.length > 0 ? (
                  waitingDrivers.map((driver, i) => (
                    <tr key={driver.id || driver.driver_id || i} className="border-t">
                      <td className="py-1">{i + 1}</td>
                      <td>{driver.plot || driver.location || driver.plot_name || 'N/A'}</td>
                      {/* <td>{driver.vehicle || driver.vehicle_type || driver.vehicle_name || 'N/A'}</td> */}
                      <td>{driver.name || driver.driver_name || `Driver ${i + 1}`}</td>
                      <td className="text-right">{driver.rank || driver.ranking || i + 1}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-gray-500">
                      No waiting drivers
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="w-full lg:w-[20.5%] bg-green-50 rounded-2xl shadow p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">On Jobs</h3>
              <span className="font-semibold">{onJobDrivers.length}</span>
            </div>
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr>
                  <th className="text-left py-1">Sr</th>
                  <th className="text-left">Driver</th>
                  {/* <th className="text-left">Job ID</th> */}
                </tr>
              </thead>
              <tbody>
                {onJobDrivers.length > 0 ? (
                  onJobDrivers.map((driver, i) => (
                    <tr key={driver.id || driver.driver_id || i} className="border-t">
                      <td className="py-1">{i + 1}</td>
                      <td>{driver.name || driver.driver_name || `Driver ${i + 1}`}</td>
                      {/* <td>{driver.job_id || driver.booking_id || driver.ride_id || 'N/A'}</td> */}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center py-4 text-gray-500">
                      No active jobs
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* <div className="flex-[1.6] bg-purple-50 rounded-2xl shadow p-3">
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
          </div> */}
        </div>
      </div>

      <div className="px-4 sm:p-6 ">
        <OverViewDetails />
      </div>

      <div
        className="
    grid gap-3
    grid-cols-2
    sm:grid-cols-3
    md:grid-cols-4
    lg:grid-cols-7
  "
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`
        flex items-center justify-center gap-2
        px-3 py-2.5
        rounded-lg
        font-semibold text-white text-[11px] sm:text-xs
        transition-all duration-200
        hover:opacity-90 hover:shadow-md
        ${tab.color}
      `}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}

            <span className="uppercase tracking-wide text-center">
              {tab.label}
            </span>

            {tab.count !== undefined && (
              <span className="bg-white/30 px-2 py-0.5 rounded-full text-[10px]">
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      <Modal
        isOpen={isBookingModelOpen.isOpen}
        className="p-4 sm:p-6 lg:p-10"
      >
        <AddBooking
          // initialValue={isBookingModelOpen.type === "edit" ? isBookingModelOpen.accountData : {}}
          setIsOpen={setIsBookingModelOpen}
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