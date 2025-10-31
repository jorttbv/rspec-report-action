import * as core from '@actions/core'
import * as github from '@actions/github'
import type {RspecResult} from './parse'
import replaceComment, {deleteComment} from '@aki77/actions-replace-comment'

const MAX_TABLE_ROWS = 20
const MAX_MESSAGE_LENGTH = 200

const truncate = (str: string, maxLength: number): string => {
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str
}

export async function examples2Table(
  examples: RspecResult['examples']
): Promise<string> {
  const {markdownTable} = await import('markdown-table')
  const baseUrl = `${github.context.serverUrl}/${github.context.repo.owner}/${github.context.repo.repo}/blob/${github.context.sha}`

  return markdownTable([
    ['Example', 'Description', 'Message'],
    ...examples
      .slice(0, MAX_TABLE_ROWS)
      .map(({filePath, lineNumber, description, message}) => [
        `\n[${filePath}:${lineNumber}](${baseUrl}/${filePath}#L${lineNumber})`,
        description,
        truncate(message, MAX_MESSAGE_LENGTH)
          .replace(/\\n/g, ' ')
          .trim()
          .replace(/\s+/g, '&nbsp;')
      ])
  ])
}

type CommentGeneralOptions = {
  token: string
  owner: string
  repo: string
  issue_number: number
}

const commentGeneralOptions = (): CommentGeneralOptions => {
  const pullRequestId = github.context.issue.number
  if (!pullRequestId) {
    throw new Error('Cannot find the PR id.')
  }

  return {
    token: core.getInput('token', {required: true}),
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: pullRequestId
  }
}

export const reportComment = async (result: RspecResult): Promise<void> => {
  const icon = result.success ? ':white_check_mark:' : ':x:'
  const title = core.getInput('title', {required: true})

  if (result.success) {
    await deleteComment({
      ...commentGeneralOptions(),
      body: title,
      startsWith: true
    })
    return
  }

  await replaceComment({
    ...commentGeneralOptions(),
    body: `# ${title} ${icon}
<details>
<summary>${result.summary}</summary>

${await examples2Table(result.examples)}

</details>
`
  })
}
