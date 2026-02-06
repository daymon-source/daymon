import { getEggImage } from '../constants/eggs'
import './EggIncubator.css'

function EggIncubator({ centerEgg }) {
    // centerEgg: 부화 중인 알 (null 또는 egg 객체)
    // 부화장치는 슬롯과 독립적으로 centerEgg만 표시

    return (
        <div className="incubator-container">
            <div className="incubator-display">
                {centerEgg && centerEgg.eggType ? (
                    <div className="incubator-egg-wrapper">
                        <img
                            src={getEggImage(centerEgg.eggType)}
                            alt="부화 중인 알"
                            className="incubator-egg-img"
                            draggable={false}
                        />
                    </div>
                ) : (
                    <div className="incubator-empty" />
                )}
            </div>
        </div>
    )
}

export default EggIncubator
