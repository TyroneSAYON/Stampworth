import { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const API_KEY = 'AIzaSyC2VkT6Kj7MY1W2ilwIjXevs5cTYJU7OXIc';

type MarkerData = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  color: string;
  icon?: 'store' | 'person';
};

type CircleData = {
  latitude: number;
  longitude: number;
  radius: number;
};

type Props = {
  center: { latitude: number; longitude: number };
  zoom?: number;
  markers?: MarkerData[];
  circle?: CircleData | null;
  showUserLocation?: boolean;
  userLocation?: { latitude: number; longitude: number } | null;
  style?: any;
};

export function GoogleMapView({ center, zoom = 15, markers = [], circle = null, showUserLocation = false, userLocation = null, style }: Props) {
  const webViewRef = useRef<WebView>(null);

  const markersJson = JSON.stringify(markers);
  const circleJson = JSON.stringify(circle);
  const userLocJson = JSON.stringify(showUserLocation && userLocation ? userLocation : null);

  const html = `
<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body,#map{width:100%;height:100%;margin:0;padding:0;}</style>
</head><body>
<div id="map"></div>
<script>
let map, markers=[], circle, userMarker;

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat:${center.latitude},lng:${center.longitude}},
    zoom: ${zoom},
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    styles: [
      {featureType:"poi",stylers:[{visibility:"off"}]},
      {featureType:"transit",stylers:[{visibility:"off"}]}
    ]
  });
  updateMarkers(${markersJson});
  updateCircle(${circleJson});
  updateUserLocation(${userLocJson});
}

function updateMarkers(data) {
  markers.forEach(m => m.setMap(null));
  markers = [];
  data.forEach(function(m) {
    var svgIcon = m.icon === 'person'
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="'+m.color+'" stroke="white" stroke-width="2"/><path d="M14 8a3 3 0 100 6 3 3 0 000-6zM9 19.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="'+m.color+'" stroke="white" stroke-width="2"/><path d="M22 11H10v1.5h12V11zm.75 7.5v-1.5l-.75-3.75H10l-.75 3.75v1.5h.75v4.5h7.5v-4.5h3v4.5h1.5v-4.5h.75zm-6.75 3H13v-3h3v3z" fill="white"/></svg>';
    var icon = {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
      scaledSize: new google.maps.Size(m.icon==='person'?28:32, m.icon==='person'?28:32),
      anchor: new google.maps.Point(m.icon==='person'?14:16, m.icon==='person'?14:16)
    };
    var marker = new google.maps.Marker({
      position: {lat:m.latitude,lng:m.longitude},
      map: map,
      title: m.title,
      icon: icon
    });
    if (m.description) {
      var info = new google.maps.InfoWindow({content:'<div style="font-family:system-ui;font-size:12px"><b>'+m.title+'</b><br/>'+m.description+'</div>'});
      marker.addListener('click', function(){info.open(map,marker);});
    }
    markers.push(marker);
  });
}

function updateCircle(data) {
  if (circle) circle.setMap(null);
  if (!data) return;
  circle = new google.maps.Circle({
    map: map,
    center: {lat:data.latitude,lng:data.longitude},
    radius: data.radius,
    strokeColor: '#2F4366',
    strokeOpacity: 0.5,
    strokeWeight: 2,
    fillColor: '#2F4366',
    fillOpacity: 0.08
  });
}

function updateUserLocation(loc) {
  if (userMarker) userMarker.setMap(null);
  if (!loc) return;
  userMarker = new google.maps.Marker({
    position: {lat:loc.latitude,lng:loc.longitude},
    map: map,
    icon: {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8" fill="#4285F4" stroke="white" stroke-width="3"/></svg>'),
      scaledSize: new google.maps.Size(20,20),
      anchor: new google.maps.Point(10,10)
    },
    title: 'You'
  });
}

function panTo(lat,lng,z) {
  map.panTo({lat:lat,lng:lng});
  if(z) map.setZoom(z);
}
</script>
<script async src="https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=initMap"></script>
</body></html>`;

  // Update markers/circle when props change
  useEffect(() => {
    webViewRef.current?.injectJavaScript(`
      if(typeof updateMarkers==='function'){updateMarkers(${markersJson});}
      if(typeof updateCircle==='function'){updateCircle(${circleJson});}
      if(typeof updateUserLocation==='function'){updateUserLocation(${userLocJson});}
      true;
    `);
  }, [markersJson, circleJson, userLocJson]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 16, overflow: 'hidden' },
  webview: { flex: 1 },
});
