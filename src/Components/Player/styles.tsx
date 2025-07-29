import { FaShuffle, FaForward, FaBackward, FaRepeat, FaPlay, FaPause, FaVolumeXmark, FaVolumeOff, FaVolumeLow, FaVolumeHigh, FaHeart, FaHeartCrack } from "react-icons/fa6"
import styled from "styled-components"

const PlayerContainer = styled.div`
    background-color: #9B7EBD;
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    align-items: stretch;
    height: 10%;
`

const StyledPlayer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`

const Song = styled.div`
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
`

const Controls = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100%;
    gap: 5px
`

const Shuffle = styled(FaShuffle)`
    max-width: 60px;
    max-height: 30px;
    cursor: pointer;
    color: #7F55B1;
`

const Next = styled(FaForward)`
    max-width: 60px;
    max-height: 30px;
    cursor: pointer;
    color: #F49BAB;
`

const Prev = styled(FaBackward)`
    max-width: 60px;
    max-height: 30px;
    cursor: pointer;
    color: #F49BAB;
`

const Repeat = styled(FaRepeat)`
    max-width: 60px;
    max-height: 30px;
    cursor: pointer;
    color: #7F55B1;
`

const Play = styled(FaPlay)`
    max-width: 60px;
    max-height: 30px;
    cursor: pointer;
    color: #F49BAB;
`

const Pause = styled(FaPause)`
    max-width: 60px;
    max-height: 30px;
    cursor: pointer;
    color: #F49BAB;
`

const Volume = styled.div`
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
`

const VolumeXmark = styled(FaVolumeXmark)`

`

const VolumeOff = styled(FaVolumeOff)`

`

const VolumeLow = styled(FaVolumeLow)`

`

const VolumeHigh = styled(FaVolumeHigh)`

`

const Heart = styled(FaHeart)`

`

const HeartCrack = styled(FaHeartCrack)`

`

export {
    PlayerContainer,
    StyledPlayer,
    Song,
    Controls,
    Shuffle,
    Next,
    Prev,
    Repeat,
    Play,
    Pause,
    Volume,
    VolumeXmark,
    VolumeOff,
    VolumeLow,
    VolumeHigh,
    Heart,
    HeartCrack
}