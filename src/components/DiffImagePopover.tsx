import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as sharp from 'sharp'
import { Popover, Position } from '@blueprintjs/core'
import electron = require('electron')
import workspace from '../workspace'

import * as path from 'path'

const { BrowserWindow, dialog } = electron.remote

import { DiffImage } from '../types'

interface DiffImagePopoverProps {
  position?: Position
  buttonClassName: string
  diffImage?: DiffImage
  onChange: (image: DiffImage) => void
  onDelete: () => void
}

interface DiffImagePopoverState {
  isOpen: boolean
  resolution: string
  align: string
  path?: string
  width?: number
  height?: number
}

const defaultState: DiffImagePopoverState = {
  isOpen: false,
  resolution: '@2x',
  align: 'center',
  width: 0,
  height: 0,
  path: undefined
}

export default class DiffImagePopover extends React.Component<
  DiffImagePopoverProps,
  DiffImagePopoverState
> {
  constructor(props: DiffImagePopoverProps) {
    super(props)
    const { diffImage } = props
    this.state = diffImage
      ? {
          isOpen: false,
          resolution: diffImage.resolution,
          align: diffImage.align,
          width: diffImage.width,
          height: diffImage.height,
          path: diffImage.file
        }
      : defaultState
  }

  sendChanges() {
    this.props.onChange({
      file: this.state.path!,
      resolution: this.state.resolution!,
      width: this.state.width!,
      height: this.state.height!,
      align: this.state.align!
    })
  }

  handleFile(fullPath: string) {
    const image = sharp(fullPath)
    image
      .metadata()
      .then(data => {
        return workspace.copyComponentFile(fullPath).then(basename => {
          this.setState(
            {
              path: basename,
              width: data.width,
              height: data.height
            },
            () => this.sendChanges()
          )
        })
      })
      .catch((e: any) => {
        console.error(e)
      })
  }

  handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    // If dropped items aren't files, reject them
    var dt = e.dataTransfer
    if (dt.items) {
      // Use DataTransferItemList interface to access the file(s)
      for (const item of Array.from(dt.items)) {
        const file = item.getAsFile()
        if (file) {
          return this.handleFile(file.path)
        }
      }
    } else {
      // Use DataTransfer interface to access the file(s)
      for (const item of Array.from(dt.files)) {
        return this.handleFile(item.path)
      }
    }
  }

  render() {
    const renderResolutionButton = (value: string) => {
      return (
        <button
          className={`pt-button ${this.state.resolution === value
            ? 'pt-active'
            : ''}`}
          type="button"
          onClick={e =>
            this.setState({ resolution: value }, () => this.sendChanges())}
        >
          {value}
        </button>
      )
    }

    const renderAlignButton = (icon: string, value: string) => {
      return (
        <button
          className={`pt-button pt-minimal pt-icon-${icon} ${this.state
            .align === value
            ? 'pt-active'
            : ''}`}
          type="button"
          onClick={e =>
            this.setState({ align: value }, () => this.sendChanges())}
        />
      )
    }

    return (
      <Popover
        position={this.props.position}
        isOpen={this.state.isOpen}
        isModal
        onInteraction={interaction =>
          !interaction && this.setState({ isOpen: false })}
      >
        <button
          className={this.props.buttonClassName}
          type="button"
          onClick={() => this.setState({ isOpen: !this.state.isOpen })}
        />
        <div style={{ padding: 20 }}>
          <div
            className="drop-zone"
            onDrop={e => this.handleDrop(e)}
            onDragEnter={e => e.preventDefault()}
            onDragOver={e => e.preventDefault()}
            onClick={e => {
              const paths = dialog.showOpenDialog(
                BrowserWindow.getFocusedWindow(),
                {
                  properties: ['openFile'],
                  filters: [
                    {
                      name: 'Images',
                      extensions: ['jpg', 'jpeg', 'tiff', 'png', 'gif']
                    }
                  ]
                }
              )
              if (paths.length > 0) {
                this.handleFile(paths[0])
              }
            }}
          >
            <p>Click or drop an image here</p>
          </div>
          {this.state.path &&
            <div style={{ textAlign: 'center' }}>
              <div className="pt-button-group">
                {renderResolutionButton('@1x')}
                {renderResolutionButton('@2x')}
              </div>
              <br />
              <br />
              <div className="pt-button-group">
                {renderAlignButton('arrow-top-left', 'top left')}
                {renderAlignButton('arrow-up', 'top')}
                {renderAlignButton('arrow-top-right', 'top right')}
              </div>
              <br />
              <div className="pt-button-group">
                {renderAlignButton('arrow-left', 'left')}
                {renderAlignButton('symbol-circle', 'center')}
                {renderAlignButton('arrow-right', 'right')}
              </div>
              <br />
              <div className="pt-button-group">
                {renderAlignButton('arrow-bottom-left', 'bottom left')}
                {renderAlignButton('arrow-down', 'bottom')}
                {renderAlignButton('arrow-bottom-right', 'bottom right')}
              </div>
            </div>}
          {this.state.path &&
            <p>
              <br />
              <button
                className="pt-button pt-intent-danger pt-fill"
                onClick={e => this.setState(defaultState, this.props.onDelete)}
              >
                Delete diff image
              </button>
            </p>}
        </div>
      </Popover>
    )
  }
}
