function FormModal(props) {
    return (
        <form onSubmit={props.onSubmit}>
            <div className="modal no-pointer show" tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{props.title}</h5>
                        </div>
                        <div className="modal-body">
                            {props.children}
                        </div>
                        <div className="modal-footer">
                            <button type="submit" className="btn btn-primary">
                                {props.submitButtonText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    )
}

export default FormModal
