import React, {
  useCallback,
  useRef,
  useState,
  useEffect
} from 'react';
import {
  GoogleMap,
  useLoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import usePlacesAutoComplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxList,
  ComboboxOption,
} from "@reach/combobox"
import "@reach/combobox/styles.css";
import mapStyles from './mapStyles.js'

const markerURL = `http://localhost:3000/markers/`
const libraries = ["places"];
const mapContainerStyle = {
  width: '100vw',
  height: '100vh'
};
const center = {
  lat: 39.396969,
  lng: -107.217529,
};
const options = {
  styles: mapStyles
}

export default function App() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [markers, setMarkers] = useState([]);
  const [selected, setSelected] = useState(null);
  
  useEffect(() => {
    fetch(markerURL)
    .then(response => response.json())
    .then(response => setMarkers(response))
  }, []);
  
  const postMarkers = (newMarker) => {
    fetch(markerURL, {
      method: "POST",
      headers: {
        'Content-Type': "application/json"
      },
      body: JSON.stringify(newMarker)
    })
    .then(response => response.json())
    return false
  }

  const removeMarkerFromMap = (event) => {
    const id = event.target.parentNode.id
      setMarkers(markers.filter(marker => {
        return marker.id !== +id
      }))
      setSelected(null)
      fetch(markerURL+id, {
        method: "DELETE"
      })
  }
  
  const [name, setName] = useState([])
  
  const onMapClick = useCallback((event) => {
    const newMarker = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
      description: ""
    }
    setMarkers(markers => [...markers, newMarker])
    postMarkers(newMarker)
  }, []);
      
  const updateInfoCard = (event) => {
    const target = event.target.parentNode.children[1]
    const id = selected.id
    const textValue = target.value
    const newMarkers = markers.map(marker =>{
      if (marker.id === id){
        let newMarker = marker
        newMarker.description = textValue
        return marker
      }
      else {
        return marker
      }
    })
    setMarkers(newMarkers)
  }

  const mapRef = useRef();
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);
  
  const panTo = useCallback(({lat, lng}) => {
    mapRef.current.panTo({lat, lng});
    mapRef.current.setZoom(11)
  }, [])
  
  if (loadError) return "Error loading maps"
  if (!isLoaded) return "Loading Maps"
  
  return (
    <div className="App">
      <h1 className="title">
        <span role="img" aria-label="squatch" className="title">
          🦧
        </span>
        Squatch Watch
        <span role="img" aria-label="squatch" className="title">
          🦧
        </span>
      </h1>

  <Search panTo={panTo} />
  <Locate panTo={panTo} />

  <GoogleMap
    mapContainerStyle={mapContainerStyle}
    zoom={11}
    center={center}
    options={options}
    onClick={onMapClick}
    onLoad={onMapLoad}
    >
      {markers.map((marker) => (
        <Marker
        key={`${marker.lat}-${marker.lng}`}
        position={{lat:marker.lat, lng: marker.lng}} 
        icon={{
          url: '/squatch.png',
          scaledSize: new window.google.maps.Size(45,45),
          origin: new window.google.maps.Point(0,0),
          anchor: new window.google.maps.Point(17,17)
        }}
        onClick={() => {
          setSelected(marker);
        }}
        />
        ))}

    {selected ? (
      <InfoWindow
      position={{ lat: selected.lat, lng: selected.lng }}
      onCloseClick={() => {
        setSelected(null);
      }}
      >
        <div id={selected.id}>
          <h2>Squatch Spotted!</h2>
          { selected.description ? (<div>
            <p>
              {selected.description}
            </p>
          </div>) : (<textarea
            required
            type="text" 
            htmlFor="title"
            value={ name }
            rows="10"
            cols="25"
            onChange={e => setName(e.target.value)}
            placeholder="Please give a description of what you saw, approximate location, time, date, contact info (if you would like), etc.">
          </textarea>)}
          { selected.description ? (<button 
            className="btn"
            type="button"
            value={selected.description.value}
            onClick={e => updateInfoCard(e)}>
              Edit
          </button>) : (<button 
            className="btn"
            type="button"
            onClick={e => updateInfoCard(e)}>
              Save
          </button>)}
          
          <button
            type="delete"
            onClick={e => removeMarkerFromMap(e)}>
              Disproven
          </button>
        </div>
      </InfoWindow>
  ) : null}
    </GoogleMap>
</div>
  );
}

function Locate({ panTo }) {
  return (
    <button className="locate"
    onClick={() => {
      navigator.geolocation.getCurrentPosition(
        (location) => {
          panTo({
            lat: location.coords.latitude,
            lng: location.coords.longitude
          })
        },
        () => null
        );
      }}
      >
      <img src="locateMe.svg" alt="compass - locate me" />
    </button>
  )
}

function Search({ panTo }) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutoComplete({
    requestOptions: {
      location: {lat: () => 39.396969, lng: () => -107.217529 },
      radius: 200 * 1000,
    },
  });
  
  return (
    <div className="search">
      <Combobox 
          onSelect={async (address) => {
            setValue(address, false);
            clearSuggestions()
            
            try {
              const results = await getGeocode({ address });
              const { lat, lng } = await getLatLng(results[0]);
              panTo({ lat, lng });
            } catch(error){
              console.log("error!")
            }
          }}
        >
          <ComboboxInput
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
            }}
            disabled={!ready}
            placeholder="Enter Location"
          />
          <ComboboxPopover>
            <ComboboxList>
              {status === "OK" &&
                data.map(({ id, description }) => (
                  <ComboboxOption key={id} value={description} />
                ))}
            </ComboboxList>
          </ComboboxPopover>
      </Combobox>
    </div>
  );
}