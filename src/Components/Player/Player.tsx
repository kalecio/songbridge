import "./Player.css"
import ProgressBar from "../ProgressBar/ProgressBar";
import { PlayerContainer, StyledPlayer, Song, Controls, Shuffle, Prev, Play, Next, Repeat, Volume } from "./styles";

const Player = () => {
    return (
        <PlayerContainer>
            <ProgressBar progress="70%"/>
            <StyledPlayer>
                <Song>song</Song>
                <Controls>
                  <Shuffle />
                  <Prev />
                  <Play />
                  <Next />
                  <Repeat />
                </Controls>
                <Volume>volume</Volume>
            </StyledPlayer>
        </PlayerContainer>
    )
}

export default Player;