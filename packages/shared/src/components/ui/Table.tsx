import type { ReactNode } from 'react'
import { Table as AntTable, ConfigProvider, theme } from 'antd'
import type { TableProps as AntTableProps } from 'antd'
import { cn } from '../../lib/utils'

export interface TableProps<T extends object> extends Omit<AntTableProps<T>, 'title'> {
  containerClassName?: string
  title?: ReactNode
  extra?: ReactNode
}

export const Table = <T extends object>({
  className,
  containerClassName,
  title,
  extra,
  ...props
}: TableProps<T>) => {
  return (
    <div className={cn('sanctuary-table-container space-y-4', containerClassName)}>
      {(title || extra) && (
        <div className="flex items-center justify-between mb-8 px-2">
          {typeof title === 'string' ? (
            <h3 className="type-headline-lg text-on-surface tracking-tight">
              {title}
            </h3>
          ) : (
            title
          )}
          {extra && <div className="flex items-center gap-3">{extra}</div>}
        </div>
      )}
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorBgContainer: 'transparent',
            colorFillAlter: 'transparent',
            colorBorderSecondary: 'var(--color-outline-variant)',
            colorText: 'var(--color-on-surface)',
            colorTextDescription: 'var(--color-on-surface-variant)',
            fontSize: 14,
            borderRadius: 4,
            fontFamily: 'var(--font-sans)',
          },
          components: {
            Table: {
              colorBgContainer: 'transparent',
              colorFillAlter: 'transparent',
              colorBorderSecondary: 'var(--color-outline-variant)',
              colorTextHeading: 'var(--color-on-surface-variant)',
              fontSize: 14,
              fontWeightStrong: 600,
              padding: 20,
            },
          },
        }}
      >
        <AntTable
          {...props}
          className={cn('sanctuary-table', '!bg-transparent', className)}
          pagination={
            props.pagination === false
              ? false
              : {
                  ...(props.pagination as object),
                  className: cn('!mt-6 !mb-0', (props.pagination as { className?: string })?.className),
                }
          }
        />
      </ConfigProvider>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .sanctuary-table .ant-table {
          background: transparent !important;
          overflow-x: auto !important;
        }
        .sanctuary-table .ant-table-thead > tr > th {
          background: transparent !important;
          border-bottom: 1px solid var(--color-outline-variant) !important;
          text-transform: uppercase;
          color: var(--color-on-surface-variant) !important;
          font-family: var(--font-sans) !important;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          padding-top: 24px !important;
          padding-bottom: 16px !important;
        }
        .sanctuary-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid var(--color-outline-variant) !important;
          color: var(--color-on-surface) !important;
          transition: background 0.2s;
          padding-top: 16px !important;
          padding-bottom: 16px !important;
        }
        .sanctuary-table .ant-table-tbody > tr:last-child > td {
          border-bottom: 1px solid var(--color-outline-variant) !important;
        }
        .sanctuary-table .ant-table-tbody > tr:hover > td {
          background: var(--color-surface-container-low) !important;
        }
        .sanctuary-table .ant-pagination-item-active {
          border-color: var(--color-primary) !important;
          background: var(--color-primary) !important;
        }
        .sanctuary-table .ant-pagination-item-active a {
          color: var(--color-on-primary) !important;
        }
      `,
        }}
      />
    </div>
  );
};
