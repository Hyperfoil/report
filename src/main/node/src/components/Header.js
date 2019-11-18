import React, { useState, useRef } from 'react';
import {
    Nav,
    PageHeader,
    NavItem,
    NavList,
    NavVariants,

} from '@patternfly/react-core';
import {
    CaretDownIcon,
} from '@patternfly/react-icons';

import Popover from '@material-ui/core/Popover';
import { NavLink } from 'react-router-dom';

import { useSelector } from 'react-redux'

const getPhases = state=>[...new Set(state.data.total.map(v=>v.phase))]

export default ({ logoProps = {} }) => {
    const [open, setOpen] = useState(false)
    // const [search, setSearch] = useState("")
    const linkEl = useRef(null);

    const phases = useSelector(getPhases)

    return (
        <PageHeader
            topNav={(
                <Nav aria-label="Nav">
                    <NavList variant={NavVariants.horizontal}>
                        
                        <NavItem itemId={0} isActive={false}>
                            <NavLink exact={true} to="/" activeClassName="pf-m-current">
                                Summary
                            </NavLink>
                        </NavItem>
                        <NavItem itemId={0} isActive={false}>
                            <NavLink exact={true} to="/details" activeClassName="pf-m-current">
                                Details
                            </NavLink>
                        </NavItem>
                        {/* <NavItem itemId={1} isActive={false}>
                            <NavLink exact={true} to="/details" activeClassName="pf-m-current">
                                Details
                            </NavLink>
                        </NavItem> */}
                        <NavItem itemId={2} isActive={false} onClick={(e, itemId) => { setOpen(!open) }}>
                            <span ref={linkEl} style={{ cursor: "pointer" }}>Phases<CaretDownIcon /></span>
                        </NavItem>
                    </NavList>
                    <Popover id="phases" open={open} anchorEl={linkEl.current} onClose={(e) => { setOpen(false) }} anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'center',
                    }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'center',
                        }}
                    >
                        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                            <nav className="pf-c-nav">
                                <ul className="pf-c-nav__simple-list" role="menu" onClick={e => setOpen(false)}>
                                    {phases.map((phaseName, phaseIndex) => {
                                        const safeName = phaseName.replace(/\//g, "_")
                                        return (
                                            <li role="none" key={phaseIndex} className="pf-c-nav__item">
                                                <NavLink className="pf-c-nav__link" to={"/phase/" + safeName}>{safeName}</NavLink>
                                            </li>
                                        )

                                    })
                                    }
                                </ul>
                            </nav>
                        </div>

                    </Popover>
                </Nav>
            )}
        >

        </PageHeader>
    )
}