import { remote } from 'electron'
import * as React from 'react'
import BroadcastPopover from './components/BroadcastPopover'
import workspace from './workspace'

import { Layout, Button } from 'antd'
import InputPopover from './components/InpuPopover'
import errorHandler from './error-handler'

const { clipboard } = remote

const { Header } = Layout

interface NavbarState {
  isCreateProjectOpen: boolean
}

interface NavbarProps {
  onAddComponent: (component: string, structure?: string) => void
}

class Navbar extends React.Component<NavbarProps, NavbarState> {
  constructor(props: any) {
    super(props)
    this.state = {
      isCreateProjectOpen: false
    }
  }

  public render() {
    return (
      <Header>
        <div style={{ lineHeight: '64px', float: 'right' }}>
          <Button.Group>
            <InputPopover
              placement="bottom"
              placeholder="Commit message"
              buttonSize="default"
              buttonIcon="hdd"
              onEnter={value => {
                // foo
              }}
            >
              Save
            </InputPopover>
            <Button
              icon="upload"
              onClick={() => {
                workspace.generate(errorHandler)
              }}
            >
              Export
            </Button>
            <BroadcastPopover />
          </Button.Group>
        </div>
        <div className="logo" />
        <div style={{ marginLeft: 180 }}>
          <InputPopover
            placement="bottom"
            placeholder="ComponentName"
            buttonSize="default"
            onEnter={value => {
              this.props.onAddComponent(value)
            }}
          >
            New component
          </InputPopover>
          <span> </span>
          <InputPopover
            placement="bottom"
            placeholder="New component from Sketch"
            buttonSize="default"
            onEnter={value => {
              this.props.onAddComponent(value, clipboard.readText())
            }}
          >
            Import from Sketch
          </InputPopover>
        </div>
      </Header>
    )
  }
}

export default Navbar
