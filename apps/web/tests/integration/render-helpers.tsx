import React from 'react'
import { render as rtlRender, RenderOptions } from '@testing-library/react'
import { MockAuthProvider } from './__mocks__/AuthContext'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValues?: any
}

const AllTheProviders: React.FC<{ children: React.ReactNode; authValues?: any }> = ({
  children,
  authValues = {}
}) => {
  return (
    <MockAuthProvider mockValues={authValues}>
      {children}
    </MockAuthProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { authValues, ...renderOptions } = options

  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders authValues={authValues}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  })
}

export * from '@testing-library/react'
export { customRender as render }