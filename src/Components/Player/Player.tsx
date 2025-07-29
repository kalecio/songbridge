import { FaShuffle, FaBackward, FaPlay, FaForward, FaRepeat } from "react-icons/fa6";
// import { FaPlay, FaPause, FaVolumeXmark, FaVolumeOff, FaVolumeLow, FaVolumeHigh, FaHeart, FaHeartCrack, FaForward, FaBackward, FaShuffle, FaRepeat } from "react-icons/fa6";
import "./Player.css"
import ProgressBar from "../ProgressBar/ProgressBar";

const Player = () => {
    return (
        <div className="player-container">

        <ProgressBar progress="70%"/>
        <div className="player">
            
            <div className="song">song</div>
            <div className="controls">
            <button className="shuffle"><FaShuffle /></button>
            <button className="prev"><FaBackward /></button>
            <button className="play"><FaPlay /></button>
            <button className="next"><FaForward /></button>
            <button className="repeat"><FaRepeat /></button>
            </div>
            <div className="volume">volume</div>
        </div>
        </div>
    )
}

export default Player;