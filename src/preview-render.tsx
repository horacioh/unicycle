/// <reference path='../node_modules/monaco-editor/monaco.d.ts' />

import * as parse5 from 'parse5'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as sass from 'node-sass'

import {
  ComponentInformation,
  ReactAttributes,
  ObjectStringToString,
  State,
  INCLUDE_PREFIX,
  componentClassName
} from './types'
import { evaluateExpression } from './eval'
import { toReactAttributeName } from './utils'
import css2obj from './css2obj'
import workspace from './workspace'

const renderComponent = (
  info: ComponentInformation,
  state: State,
  rootNodeProperties: React.CSSProperties | null,
  components: Set<string>,
  errorHandler: (
    component: string,
    position: monaco.Position,
    text: string
  ) => void
): React.ReactNode => {
  components.add(info.name)
  const renderNode = (
    data: {},
    node: parse5.AST.Default.Node,
    key: string | number | null,
    additionalStyles: React.CSSProperties | null,
    additionalClassName: string | null,
    isRoot: boolean
  ): React.ReactNode => {
    const locationJSON = (location: parse5.MarkupData.ElementLocation) =>
      JSON.stringify({
        ln: location.line,
        c: location.col,
        eln:
          location.endTag !== undefined ? location.endTag.line : location.line
      })
    try {
      if (node.nodeName === '#text') {
        const textNode = node as parse5.AST.Default.TextNode
        return textNode.value.replace(/{([^}]+)?}/g, str => {
          return evaluateExpression(str.substring(1, str.length - 1), data)
        })
      }
      const element = node as parse5.AST.Default.Element
      if (!element.childNodes) return undefined
      const _if = element.attrs.find(attr => attr.name === '@if')
      if (_if) {
        const result = evaluateExpression(_if.value, data)
        if (!result) return undefined
      }
      const loop = element.attrs.find(attr => attr.name === '@loop')
      const as = element.attrs.find(attr => attr.name === '@as')
      if (loop && as) {
        const collection = evaluateExpression(loop.value, data) as any[]
        if (!collection) return undefined
        const template = Object.assign({}, node, {
          attrs: element.attrs.filter(attr => !attr.name.startsWith('@'))
        })
        return collection.map((obj, i) =>
          renderNode(
            Object.assign({}, data, { [as.value]: obj }),
            template,
            i,
            null,
            additionalClassName,
            false
          )
        )
      }
      if (node.nodeName.startsWith(INCLUDE_PREFIX)) {
        const componentName = node.nodeName.substring(INCLUDE_PREFIX.length)
        const componentInfo = workspace.loadComponent(componentName)
        const result = sass.renderSync({
          data: componentInfo.style,
          sourceMap: false
        })
        const props = element.attrs.reduce(
          (props, attr) => {
            if (attr.name.startsWith(':')) {
              const name = attr.name.substring(1)
              const expression = attr.value
              props[name] = evaluateExpression(expression, data)
            } else {
              // TODO: convert to type
              props[attr.name] = attr.value
            }
            return props
          },
          {} as any
        )
        // TODO: validate props
        const componentState: State = {
          name: 'Included',
          props
        }
        // TODO: key?
        return renderComponent(
          componentInfo,
          componentState,
          null,
          components,
          errorHandler
        )
      }
      const attrs: ReactAttributes = element.attrs
        .filter(
          attr => !attr.name.startsWith(':') && !attr.name.startsWith('@')
        )
        .reduce(
          (obj, attr) => {
            const name = toReactAttributeName(attr.name)
            if (name) {
              obj[name] = attr.value
            }
            return obj
          },
          {} as ObjectStringToString
        )
      if (key !== null) {
        attrs['key'] = String(key)
      }
      element.attrs.forEach(attr => {
        if (!attr.name.startsWith(':')) return
        const name = attr.name.substring(1)
        const expression = attr.value
        const fname = toReactAttributeName(name)
        if (fname) {
          attrs[fname] = evaluateExpression(expression, data)
        }
      })
      if (attrs['style']) {
        attrs['style'] = css2obj(attrs['style'] as string)
      }
      const location = element.__location
      if (location) {
        attrs['data-location'] = locationJSON(location)
      }
      attrs['style'] = Object.assign({}, attrs['style'] || {}, additionalStyles)
      if (isRoot) {
        attrs['className'] = `COMPONENT-ROOT ${attrs['className'] || ''}`
      }
      if (additionalClassName) {
        attrs['className'] = `${additionalClassName} ${attrs['className'] ||
          ''}`
      }
      const childNodes = element.childNodes.map((node, i) =>
        renderNode(data, node, i, null, additionalClassName, false)
      )
      return React.createElement.apply(
        null,
        new Array<any>(node.nodeName, attrs).concat(childNodes)
      )
    } catch (err) {
      const element = node as parse5.AST.Default.Element
      if (node && element.__location) {
        errorHandler(
          info.name,
          new monaco.Position(element.__location.line, element.__location.col),
          err.message
        )
      }
      return (
        <span
          style={{
            all: 'initial',
            fontFamily: 'sans-serif',
            display: 'inline-block',
            color: '#444',
            backgroundColor: '#FAE1E1',
            padding: '3px 10px',
            fontSize: 14,
            fontWeight: 'bold'
          }}
          data-location={element.__location && locationJSON(element.__location)}
        >
          <span style={{ color: '#c23030' }}>Error:</span> {err.message}
        </span>
      )
    }
  }
  const rootNode = info.markup.childNodes[0]
  return renderNode(
    state.props,
    rootNode,
    null,
    rootNodeProperties,
    componentClassName(info.name),
    true
  )
}

export default renderComponent