function Hound(props) {
    const statusExists = props.status !== null
    const buttonClass =
        'Dogs Outside' === props.status ? 'btn-danger' : 'btn-primary'

    function releaseClickHandler() {
        props.onReleaseHound(props.user)
    }

    return (
        <div className="row centered-content my-2" data-testid="hound">
            <div className="col-md-9">
                <div className="card card-body">
                    <div className="row">
                        <div className="col">
                            <h5 className="card-title">{props.user}</h5>
                        </div>
                        {statusExists && (
                            <div className="col end-content">
                                {props.isReleasable && (
                                    <button
                                        className="btn btn-danger mx-2"
                                        onClick={releaseClickHandler}
                                    >
                                        Release
                                    </button>
                                )}
                                <button
                                    className={`btn ${buttonClass} no-pointer`}
                                >
                                    {props.status}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Hound
