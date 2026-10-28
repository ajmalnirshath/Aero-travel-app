/**
 * Vehicle rows with real product images.
 * Images are served from the public/ folder — put your files at
 * public/Aero/bike.png, public/Aero/auto.png, public/Aero/car.png
 * and reference them as "/Aero/<name>.png".
 */

const IMAGES = {
  bike: { src: 'bike.png', alt: 'Bike' ,height: 50, width: 36 },
  auto: { src: 'tuktuk.png', alt: 'Auto rickshaw' ,height: 32, width: 32 },
  car:  { src: 'car.png', alt: 'Car' ,height: 32, width: 32 },
}

export default function VehiclePicker({ options, selected, onSelect }) {
  if (!options?.length) return null
  return (
    <div className="vehicle-list" role="radiogroup" aria-label="Choose a vehicle">
      {options.map((v) => {
        const img = IMAGES[v.id] || IMAGES.car
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={selected === v.id}
            className="vehicle-row"
            onClick={() => onSelect(v.id)}
          >
            <span className="v-icon v-icon-img">
              <img src={img.src} alt="" loading="lazy" />
            </span>
            <span>
              <span className="v-name">{v.name}</span>
              <span className="v-note">{v.note} · {v.etaMin} min away</span>
            </span>
            <span className="fare-line">
              <span className="fare-dots" aria-hidden="true" />
              <span className="num">₹{v.fare}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}