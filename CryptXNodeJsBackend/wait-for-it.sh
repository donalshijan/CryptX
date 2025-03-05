#!/usr/bin/env bash
# Use this script to test if a given TCP host/port are available

WAITFORIT_cmdname=${0##*/}

echoerr() {
    if [[ $WAITFORIT_QUIET -ne 1 ]]; then echo "$@" 1>&2; fi
}

usage() {
    cat << USAGE >&2
Usage:
    $WAITFORIT_cmdname host:port [-s] [-t timeout] [-- command args]
    -h HOST | --host=HOST       Host or IP under test
    -p PORT | --port=PORT       TCP port under test
                                Alternatively, you specify the host and port as host:port
    -s | --strict               Only execute subcommand if the test succeeds
    -q | --quiet                Don't output any status messages
    -t TIMEOUT | --timeout=TIMEOUT
                                Timeout in seconds, zero for no timeout
    -- COMMAND ARGS             Execute command with args after the test finishes
USAGE
    exit 1
}

wait_for() {
    if [[ $WAITFORIT_TIMEOUT -gt 0 ]]; then
        echoerr "$WAITFORIT_cmdname: waiting $WAITFORIT_TIMEOUT seconds for $WAITFORIT_HOST:$WAITFORIT_PORT"
    else
        echoerr "$WAITFORIT_cmdname: waiting for $WAITFORIT_HOST:$WAITFORIT_PORT without a timeout"
    fi
    WAITFORIT_start_ts=$(date +%s)
    while :
    do
        if [[ $WAITFORIT_ISBUSY -eq 1 ]]; then
            nc -z "$WAITFORIT_HOST" "$WAITFORIT_PORT"
            WAITFORIT_result=$?
        else
            (echo -n > /dev/tcp/"$WAITFORIT_HOST"/"$WAITFORIT_PORT") >/dev/null 2>&1
            WAITFORIT_result=$?
        fi
        if [[ $WAITFORIT_result -eq 0 ]]; then
            WAITFORIT_end_ts=$(date +%s)
            echoerr "$WAITFORIT_cmdname: $WAITFORIT_HOST:$WAITFORIT_PORT is available after $((WAITFORIT_end_ts - WAITFORIT_start_ts)) seconds"
            break
        fi
        sleep 1
    done
    return "$WAITFORIT_result"
}

wait_for_wrapper() {
    # In order to support SIGINT during timeout: http://unix.stackexchange.com/a/57692
    if [[ $WAITFORIT_QUIET -eq 1 ]]; then
        timeout "$WAITFORIT_TIMEOUT" "$0" --quiet --child --host="$WAITFORIT_HOST" --port="$WAITFORIT_PORT" --timeout="$WAITFORIT_TIMEOUT" &
    else
        timeout "$WAITFORIT_TIMEOUT" "$0" --child --host="$WAITFORIT_HOST" --port="$WAITFORIT_PORT" --timeout="$WAITFORIT_TIMEOUT" &
    fi
    WAITFORIT_pid=$!
    trap 'kill -INT -$WAITFORIT_pid' INT
    wait $WAITFORIT_pid
    WAITFORIT_result=$?
    if [[ $WAITFORIT_result -ne 0 ]]; then
        echoerr "$WAITFORIT_cmdname: timeout occurred after waiting $WAITFORIT_TIMEOUT seconds for $WAITFORIT_HOST:$WAITFORIT_PORT"
    fi
    return $WAITFORIT_result
}

parse_params() {
    # Set default values:
    WAITFORIT_HOST=
    WAITFORIT_PORT=
    WAITFORIT_TIMEOUT=15
    WAITFORIT_STRICT=0
    WAITFORIT_CHILD=0
    WAITFORIT_QUIET=0

    while [[ $# -gt 0 ]]
    do
        case "$1" in
            *:* )
            IFS=: read -r WAITFORIT_HOST WAITFORIT_PORT <<< "$1"
            shift 1
            ;;
            -h)
            WAITFORIT_HOST="$2"
            if [[ $WAITFORIT_HOST == "" ]]; then break; fi
            shift 2
            ;;
            --host=*)
            WAITFORIT_HOST="${1#*=}"
            shift 1
            ;;
            -p)
            WAITFORIT_PORT="$2"
            if [[ $WAITFORIT_PORT == "" ]]; then break; fi
            shift 2
            ;;
            --port=*)
            WAITFORIT_PORT="${1#*=}"
            shift 1
            ;;
            -t)
            WAITFORIT_TIMEOUT="$2"
            if [[ $WAITFORIT_TIMEOUT == "" ]]; then break; fi
            shift 2
            ;;
            --timeout=*)
            WAITFORIT_TIMEOUT="${1#*=}"
            shift 1
            ;;
            -s | --strict)
            WAITFORIT_STRICT=1
            shift 1
            ;;
            -q | --quiet)
            WAITFORIT_QUIET=1
            shift 1
            ;;
            --child)
            WAITFORIT_CHILD=1
            shift 1
            ;;
            --)
            shift
            WAITFORIT_CLI=("$@")
            break
            ;;
            -*)
            usage
            ;;
            *)
            WAITFORIT_CLI+=("$1")
            shift 1
            ;;
        esac
    done
}

parse_params "$@"

if [[ "$WAITFORIT_HOST" == "" || "$WAITFORIT_PORT" == "" ]]; then
    echoerr "Error: you need to provide a host and port to test."
    usage
    exit 0
fi

if [[ $WAITFORIT_CHILD -gt 0 ]]; then
    wait_for
    WAITFORIT_result=$?
else
    if [[ $WAITFORIT_TIMEOUT -gt 0 ]]; then
        wait_for_wrapper
        WAITFORIT_result=$?
    else
        wait_for
        WAITFORIT_result=$?
    fi
fi

if [[ $WAITFORIT_STRICT -eq 1 ]]; then
    if [[ $WAITFORIT_result -ne 0 ]]; then
        exit "$WAITFORIT_result"
    fi
fi


if [[ $WAITFORIT_result -eq 0 && ${#WAITFORIT_CLI[@]} -gt 0 ]]; then
    exec "${WAITFORIT_CLI[@]}"
fi

if [[ $WAITFORIT_result -ne 0 && ${#WAITFORIT_CLI[@]} -gt 0 ]]; then
    echo "Running the command to start server anyways..."
    exec "${WAITFORIT_CLI[@]}"
else
    exit "$WAITFORIT_result"
fi
