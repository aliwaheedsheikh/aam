        // For the first cell, show each tentative's label
        return (
          <div
            key={`${hour}-${hourIndex}`}
            className="w-20 h-12 border-r border-gray-200 relative bg-yellow-400 text-gray-900 group border-l-2 border-l-yellow-600"
          >
            {/* Show "T-n" labels for each tentative - each individually clickable */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              {tentativesAtHour.map((t, idx) => {
                // Find the position of this tentative in the full list
                const position = allSpaceTentatives.findIndex(st => st.id === t.id) + 1;
                return (
                  <div 
                    key={t.id} 
                    className="text-xs font-bold leading-none cursor-pointer hover:bg-yellow-500 px-2 py-1 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Open this specific tentative's booking details
                      onBookingClick(t);
                    }}
                    title={`${t.customerName} - ${t.startTime} to ${t.endTime}\nClick to view details`}
                  >
                    T-{position}
                  </div>
                );
              })}
            </div>
            
            {/* Queue view button - only show if multiple tentatives */}
            {tentativesAtHour.length > 1 && (
              <div 
                className="absolute bottom-0 right-0 mb-0.5 mr-0.5 cursor-pointer hover:bg-yellow-500 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-yellow-600 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTentatives(tentativesAtHour);
                  setSelectedTentativeSpace({ 
                    name: spaceName, 
                    venueId, 
                    isPrime, 
                    spaceId 
                  });
                  setSelectedTentativeTimeSlot(`${hour}:00`);
                  setSelectedTentativeDate(currentDate);
                  setTentativeQueueOpen(true);
                }}
                title="View all tentatives in queue"
              >
                Queue
              </div>
            )}
            
            {/* Hover tooltip */}
            <div className="absolute left-0 top-full mt-1 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-yellow-600 text-white text-xs rounded-lg shadow-xl px-3 py-2 whitespace-nowrap">
                <div className="font-semibold">{tentativesAtHour.length} Tentative Booking{tentativesAtHour.length !== 1 ? 's' : ''}</div>
                <div className="text-yellow-100 mt-0.5">Click T-n to view individual booking</div>
                {tentativesAtHour.length > 1 && (
                  <div className="text-yellow-100 mt-0.5">Click "Queue" to manage priority</div>
                )}
                <div className="text-yellow-100 text-[10px] mt-1 border-t border-yellow-500 pt-1">
                  {tentativesAtHour.map((t, i) => {
                    const position = allSpaceTentatives.findIndex(st => st.id === t.id) + 1;
                    return (
                      <div key={t.id}>T-{position}: {t.customerName}</div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
