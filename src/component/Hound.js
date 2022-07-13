import { Status } from '../model/Status'

function Hound(props) {
    const statusExists = props.status !== null
    const buttonClass = Status.DOGS_OUTSIDE === props.status ? 'btn-danger' : 'btn-primary'

    function releaseClickHandler() {
        props.onReleaseHound(props.status)
    }

    return (
        <div className="row centered-content my-2" data-testid="hound">
            <div className="col-md-9">
                <div className="card card-body">
                    <div className="row">
                        <div className="col">
                            <h5 className="card-title">{ props.user }</h5>
                        </div>
                        { statusExists && (
                            <div className="col end-content">
                                { props.isReleasable && (
                                    <button className="btn btn-danger mx-2" onClick={ releaseClickHandler }>
                                        { props.status.actionDescription }
                                    </button>
                                ) }
                                <button
                                    className={ `btn ${ buttonClass } no-pointer` }>{ props.status.description }</button>
                            </div>
                        ) }
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Hound
