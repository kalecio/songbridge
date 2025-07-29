import "./ProgressBar.css"

interface ProgressBarProps {
    progress: string;
}

const ProgressBar = ({progress}: ProgressBarProps) => {
    return (
         <div className="progress-bar">
            <div className="inner-progress-bar" style={{width: progress}}></div>
        </div>
    )
}

export default ProgressBar;