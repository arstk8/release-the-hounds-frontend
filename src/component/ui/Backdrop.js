function Backdrop(props) {
    return (
        <div
            className="modal-backdrop show"
            onClick={props.onDismiss}
        />
    )
}

export default Backdrop
