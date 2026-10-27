import {
  Map as MapLibreMap,
  MercatorCoordinate,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";

setWorkerUrl(mapLibreWorkerUrl);

const modelLocations = [
  {
    id: "shahid",
    label: "مدل شهید",
    url: "/shahid.fbx",
    longitude: 50.063924,
    latitude: 36.327383,
  },
  {
    id: "office",
    label: "مدل اداری",
    url: "/office.fbx",
    longitude: 50.028717,
    latitude: 36.306468,
    rotation: 5.6,
  },
];

const map = new MapLibreMap({
  container: "map",
  style: "/styleMap.json",
  projection: { type: "mercator" },
  center: [50.0463, 36.317],
  zoom: 12,
  pitch: 40,
  antialias: true,
});

map.addControl(new NavigationControl(), "top-right");

map.on("error", (event) => {
  console.error("Map resource failed to load:", event.error);
});

map.on("style.load", () => {
  addModelLocations();
  if (!map.getLayer("fbx-models")) {
    map.addLayer(createFbxLayer());
  }
});

function addModelLocations() {
  const sourceId = "fbx-model-locations";
  const layerId = "fbx-model-location-points";

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: modelLocations.map((location) => ({
          type: "Feature",
          properties: { id: location.id, label: location.label },
          geometry: {
            type: "Point",
            coordinates: [location.longitude, location.latitude],
          },
        })),
      },
    });
  }

  map.on("click", layerId, (event) => {
    const coordinates = event.features?.[0]?.geometry.coordinates;

    if (!Array.isArray(coordinates)) {
      return;
    }

    map.flyTo({
      center: coordinates,
      zoom: 17,
      pitch: 60,
      essential: true,
    });
  });

  map.on("mouseenter", layerId, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", layerId, () => {
    map.getCanvas().style.cursor = "";
  });
}

function createFbxLayer() {
  let mapInstance;
  let webglContext;
  let renderer;
  let THREE;
  let scene;
  let camera;
  let modelsLoading = false;
  let entries = []; // { group, transform }

  return {
    id: "fbx-models",
    type: "custom",
    renderingMode: "3d",

    onAdd(map, gl) {
      mapInstance = map;
      webglContext = gl;
      mapInstance.on("zoomend", loadModels);
      loadModels();
    },

    render(_gl, options) {
      if (!renderer || entries.length === 0 || map.getZoom() < 16) {
        return;
      }

      const mainMatrix = new THREE.Matrix4().fromArray(
        options.defaultProjectionData.mainMatrix,
      );

      renderer.resetState();
      for (const entry of entries) {
        // Only the current model is visible in each pass
        for (const other of entries) {
          other.group.visible = other === entry;
        }
        camera.projectionMatrix.copy(mainMatrix).multiply(entry.transform);
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
        renderer.render(scene, camera);
        renderer.resetState();
      }
    },

    onRemove() {
      mapInstance?.off("zoomend", loadModels);
      scene?.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          for (const material of materials) {
            material.dispose();
          }
        }
      });
      renderer?.dispose();
      entries = [];
    },
  };

  async function loadModels() {
    if (modelsLoading || map.getZoom() < 16) {
      return;
    }

    modelsLoading = true;
    try {
      const [threeModule, { FBXLoader }] = await Promise.all([
        import("three"),
        import("three/addons/loaders/FBXLoader.js"),
      ]);
      THREE = threeModule;
      if (!renderer) {
        renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: webglContext,
          antialias: true,
        });
        renderer.autoClear = false;
        scene = new THREE.Scene();
        camera = new THREE.Camera();

        scene.add(new THREE.AmbientLight(0xffffff, 2));
        const sunlight = new THREE.DirectionalLight(0xffffff, 2);
        sunlight.position.set(0, -70, 100).normalize();
        scene.add(sunlight);
      }

      const loader = new FBXLoader();
      for (const location of modelLocations) {
        loader.load(
          location.url,
          (model) => {
            try {
              addModel(model, location);
              map.triggerRepaint();
            } catch (error) {
              reportModelError(location.url, error);
            }
          },
          undefined,
          (error) => reportModelError(location.url, error),
        );
      }
    } catch (error) {
      console.error("Unable to initialize the FBX map layer:", error);
      modelsLoading = false;
    }
  }

  function addModel(model, location) {
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const longestSide = Math.max(size.x, size.y, size.z);

    if (!Number.isFinite(longestSide) || longestSide === 0) {
      throw new Error(`FBX model has no measurable geometry: ${location.url}`);
    }

    // Keep the model at the origin; its position is applied through the
    // per-model matrix in render() with double precision on the CPU.
    model.position.set(-center.x, -bounds.min.y, -center.z);

    const coordinate = MercatorCoordinate.fromLngLat([
      location.longitude,
      location.latitude,
    ]);
    const modelSizeMeters = 40;
    const scale =
      (coordinate.meterInMercatorCoordinateUnits() * modelSizeMeters) /
      longestSide;

    const modelTransform = new THREE.Matrix4()
      .makeTranslation(coordinate.x, coordinate.y, coordinate.z)
      .scale(new THREE.Vector3(scale, -scale, scale))
      .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
      .multiply(new THREE.Matrix4().makeRotationY(location.rotation || 0));

    const modelGroup = new THREE.Group();
    modelGroup.add(model);
    scene.add(modelGroup);

    entries.push({ group: modelGroup, transform: modelTransform });
  }

  function reportModelError(url, error) {
    console.error(`Unable to load map model ${url}:`, error);
  }
}
