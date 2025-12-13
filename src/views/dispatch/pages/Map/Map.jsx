import React, { useState } from 'react'
import PageTitle from '../../../../components/ui/PageTitle/PageTitle';
import PageSubTitle from '../../../../components/ui/PageSubTitle/PageSubTitle';
import CardContainer from '../../../../components/shared/CardContainer';
import SearchBar from '../../../../components/shared/SearchBar/SearchBar';
import CustomSelect from '../../../../components/ui/CustomSelect';
import { STATUS_OPTIONS } from '../../../../constants/selectOptions';

const Map = () => {
  const [_searchQuery, setSearchQuery] = useState("");
  const [_selectedStatus, setSelectedStatus] = useState(
    STATUS_OPTIONS.find((o) => o.value === "all") ?? STATUS_OPTIONS[0]
  );
  return (
    <div className="px-4 py-5 sm:p-6 lg:p-10 min-h-[calc(100vh-85px)]">
      <div className="flex flex-col gap-2.5 sm:mb-[30px] mb-6">
        <div className="flex justify-between">
          <PageTitle title="Map" />
        </div>
        <div>
          <PageSubTitle title="Driver Location & Aerial View " />
        </div>
      </div>
      <div className="flex flex-col sm:gap-5 gap-4">
        <div>
          <div>
            <CardContainer className="p-3 sm:p-4 lg:p-5 bg-[#F5F5F5]">
              <div className="flex flex-row items-stretch sm:items-center gap-3 sm:gap-5 justify-between mb-4 sm:mb-0 pb-4">
                <div className="md:w-full w-[calc(100%-54px)] sm:flex-1">
                  <SearchBar
                    value={_searchQuery}
                    // onSearchChange={handleSearchChange}
                    className="w-full md:max-w-[400px] max-w-full"
                  />
                </div>
                <div className="hidden md:flex flex-row gap-3 sm:gap-5 w-full sm:w-auto">
                  <CustomSelect
                    variant={2}
                    options={STATUS_OPTIONS}
                    value={_selectedStatus}
                    // onChange={handleStatusChange}
                    placeholder="Driver Status"
                  />
                </div>
              </div>
              <div className="relative w-full h-[550px] rounded-xl overflow-hidden border border-gray-200">
                <iframe
                  title="map"
                  src="https://maps.google.com/maps?q=london&t=&z=11&ie=UTF8&iwloc=&output=embed"
                  className="w-full h-full"
                ></iframe>
              </div>
              <div className="flex justify-center gap-10 flex-wrap py-4 mt-3 border-t">

                <div className="flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-green-500"></span>
                  <span className="text-gray-700 text-sm">Online Drivers</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-gray-500"></span>
                  <span className="text-gray-700 text-sm">Offline Drivers</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-600"></span>
                  <span className="text-gray-700 text-sm">Active Ride Drivers</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-yellow-500"></span>
                  <span className="text-gray-700 text-sm">Ride Pending Drivers</span>
                </div>

              </div>
            </CardContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Map